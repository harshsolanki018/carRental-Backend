const Booking = require('../models/booking.model');
const Car = require('../models/car.model');
const crypto = require('crypto');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const env = require('../config/env');
const { BOOKING_STATUS, CAR_STATUS, PAYMENT_STATUS } = require('../constants/enums');
const { razorpay } = require('../services/razorpay.service');
const { syncBookingStatusesByDate } = require('../services/booking-status.service');

const ACTIVE_BOOKING_STATUSES = [
  BOOKING_STATUS.CONFIRMED,
  BOOKING_STATUS.ACTIVE,
  BOOKING_STATUS.AWAITING_RETURN,
];

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

function isValidAadhaar(aadhaar) {
  return /^\d{12}$/.test(aadhaar);
}

function getTotalDays(pickupDate, returnDate) {
  const start = new Date(pickupDate);
  const end = new Date(returnDate);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

async function hasDateConflict(carId, pickupDate, returnDate) {
  const relevant = await Booking.find({
    carId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });

  const newStart = new Date(pickupDate);
  const newEnd = new Date(returnDate);

  return relevant.some((booking) => {
    const existingStart = new Date(booking.pickupDate);
    const existingEnd = new Date(booking.returnDate);
    return newStart <= existingEnd && newEnd >= existingStart;
  });
}

function normalizeBooking(booking, carNumberLookup) {
  return {
    ...booking.toObject(),
    bookingId: booking.bookingId || `BK-${booking.id || Date.now()}`,
    carNumber: booking.carNumber || carNumberLookup.get(booking.carId) || 'N/A',
    fullName: booking.fullName || 'N/A',
    phone: booking.phone || 'N/A',
    userEmail: booking.userEmail || 'N/A',
  };
}

async function setCarStatus(carId, bookingStatus) {
  const car = await Car.findOne({ id: carId });
  if (!car) {
    return;
  }

  if (ACTIVE_BOOKING_STATUSES.includes(bookingStatus)) {
    car.status = CAR_STATUS.BOOKED;
  }

  if (
    bookingStatus === BOOKING_STATUS.COMPLETED ||
    bookingStatus === BOOKING_STATUS.REJECTED
  ) {
    car.status = CAR_STATUS.AVAILABLE;
  }

  await car.save();
}

function isPickupDateReached(pickupDate) {
  const parsed = new Date(pickupDate);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed <= today;
}

function normalizeBookingPayload(body) {
  return {
    carId: Number(body.carId),
    pickupDate: String(body.pickupDate || '').trim(),
    returnDate: String(body.returnDate || '').trim(),
    fullName: String(body.fullName || '').trim(),
    phone: String(body.phone || '').trim(),
    alternatePhone: String(body.alternatePhone || '').trim(),
    address: String(body.address || '').trim(),
    aadhaar: String(body.aadhaar || '').trim(),
  };
}

async function getBookingQuote(payload) {
  const car = await Car.findOne({ id: payload.carId });
  if (!car) {
    throw new HttpError(404, 'Car not found.');
  }

  if (!payload.pickupDate || !payload.returnDate) {
    throw new HttpError(400, 'Please select pickup and return dates.');
  }

  if (!payload.fullName || !payload.phone) {
    throw new HttpError(400, 'Please enter full name and phone number.');
  }

  if (!isValidPhone(payload.phone)) {
    throw new HttpError(400, 'Phone number must be 10 digits.');
  }

  if (payload.alternatePhone && !isValidPhone(payload.alternatePhone)) {
    throw new HttpError(400, 'Alternate phone number must be 10 digits.');
  }

  if (!isValidAadhaar(payload.aadhaar)) {
    throw new HttpError(400, 'Aadhaar number must be exactly 12 digits.');
  }

  const totalDays = getTotalDays(payload.pickupDate, payload.returnDate);
  if (totalDays <= 0) {
    throw new HttpError(400, 'Return date must be after pickup date.');
  }

  const conflict = await hasDateConflict(
    payload.carId,
    payload.pickupDate,
    payload.returnDate
  );
  if (conflict) {
    throw new HttpError(400, 'Selected dates are unavailable.');
  }

  const totalPrice = totalDays * Number(car.pricePerDay || 0);

  return { car, totalDays, totalPrice };
}

const createPaymentOrder = asyncHandler(async (req, res) => {
  const payload = normalizeBookingPayload(req.body);
  const { totalPrice } = await getBookingQuote(payload);

  const amount = Math.round(totalPrice * 100);
  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `booking_${payload.carId}_${Date.now()}`,
  });

  res.status(201).json({
    success: true,
    message: 'Payment order created.',
    data: {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.razorpayKeyId,
    },
  });
});

const verifyPaymentAndCreateBooking = asyncHandler(async (req, res) => {
  const payload = normalizeBookingPayload(req.body);
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};

  if (!orderId || !paymentId || !signature) {
    throw new HttpError(400, 'Payment verification data is missing.');
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new HttpError(400, 'Payment signature verification failed.');
  }

  const { car, totalDays, totalPrice } = await getBookingQuote(payload);
  const order = await razorpay.orders.fetch(orderId);
  const expectedAmount = Math.round(totalPrice * 100);

  if (!order || order.amount !== expectedAmount) {
    throw new HttpError(400, 'Payment amount mismatch. Please try again.');
  }

  const existing = await Booking.findOne({
    $or: [{ orderId }, { paymentId }],
  });

  if (existing) {
    res.json({
      success: true,
      message: 'Booking already confirmed.',
      data: existing,
    });
    return;
  }

  const booking = new Booking({
    carId: car.id,
    carNumber: car.carNumber || '',
    carName: car.name,
    image: car.image || '',
    pickupDate: payload.pickupDate,
    returnDate: payload.returnDate,
    totalDays,
    totalPrice,
    orderId,
    paymentId,
    paymentStatus: PAYMENT_STATUS.SUCCESS,
    status: BOOKING_STATUS.CONFIRMED,
    rating: 0,
    userId: req.user.id,
    userEmail: req.user.email,
    fullName: payload.fullName,
    phone: payload.phone,
    alternatePhone: payload.alternatePhone,
    address: payload.address,
    aadhaar: payload.aadhaar,
  });

  await booking.save();
  await setCarStatus(booking.carId, booking.status);

  res.status(201).json({
    success: true,
    message: `Booking confirmed! ID: ${booking.bookingId}`,
    data: booking,
  });
});

const getMyBookings = asyncHandler(async (req, res) => {
  await syncBookingStatusesByDate();
  const bookings = await Booking.find({
    $or: [{ userId: req.user.id }, { userEmail: req.user.email }],
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: bookings,
  });
});

const cancelMyBooking = asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  const booking = await Booking.findOne({ id: bookingId });

  if (!booking) {
    throw new HttpError(404, 'Booking not found.');
  }

  const isOwner =
    booking.userId === req.user.id || booking.userEmail === req.user.email;
  if (!isOwner) {
    throw new HttpError(403, 'Forbidden');
  }

  if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS) {
    throw new HttpError(400, 'Paid bookings cannot be cancelled.');
  }

  if (![BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
    throw new HttpError(400, 'Only confirmed bookings can be cancelled.');
  }

  if (isPickupDateReached(booking.pickupDate)) {
    throw new HttpError(400, 'Booking cannot be cancelled on or after pickup date.');
  }

  booking.status = BOOKING_STATUS.REJECTED;
  await booking.save();
  await setCarStatus(booking.carId, booking.status);

  res.json({
    success: true,
    message: 'Booking cancelled.',
    data: booking,
  });
});

const rateMyBooking = asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  const rating = Number(req.body.rating);

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating must be between 1 and 5.');
  }

  const booking = await Booking.findOne({ id: bookingId });
  if (!booking) {
    throw new HttpError(404, 'Booking not found.');
  }

  const isOwner =
    booking.userId === req.user.id || booking.userEmail === req.user.email;
  if (!isOwner) {
    throw new HttpError(403, 'Forbidden');
  }

  booking.rating = rating;
  await booking.save();

  res.json({
    success: true,
    message: 'Thanks for your rating.',
    data: booking,
  });
});

const getBookedRangesForCar = asyncHandler(async (req, res) => {
  const carId = Number(req.params.carId);
  await syncBookingStatusesByDate();
  const bookings = await Booking.find({
    carId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });

  const ranges = bookings.map((booking) => ({
    start: booking.pickupDate,
    end: booking.returnDate,
  }));

  res.json({
    success: true,
    data: ranges,
  });
});

const listAdminBookings = asyncHandler(async (req, res) => {
  await syncBookingStatusesByDate();
  const rawBookings = await Booking.find().sort({ id: -1 });
  const cars = await Car.find();
  const carNumberLookup = new Map(
    cars.map((car) => [car.id, car.carNumber || 'N/A'])
  );

  const bookings = rawBookings.map((booking) =>
    normalizeBooking(booking, carNumberLookup)
  );

  res.json({
    success: true,
    data: bookings,
  });
});

const markBookingActive = asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  const booking = await Booking.findOne({ id: bookingId });
  if (!booking) {
    throw new HttpError(404, 'Booking not found.');
  }

  if (
    ![
      BOOKING_STATUS.CONFIRMED,
    ].includes(booking.status)
  ) {
    throw new HttpError(400, 'Only confirmed bookings can be activated.');
  }

  booking.status = BOOKING_STATUS.ACTIVE;
  await booking.save();
  await setCarStatus(booking.carId, booking.status);

  res.json({
    success: true,
    message: 'Booking marked as active.',
    data: booking,
  });
});

const rejectBooking = asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  const booking = await Booking.findOne({ id: bookingId });
  if (!booking) {
    throw new HttpError(404, 'Booking not found.');
  }

  if (
    ![
      BOOKING_STATUS.CONFIRMED,
    ].includes(booking.status)
  ) {
    throw new HttpError(400, 'Only confirmed bookings can be rejected.');
  }

  booking.status = BOOKING_STATUS.REJECTED;
  await booking.save();
  await setCarStatus(booking.carId, BOOKING_STATUS.REJECTED);

  res.json({
    success: true,
    message: 'Booking rejected successfully.',
    data: booking,
  });
});

const completeBooking = asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  const booking = await Booking.findOne({ id: bookingId });
  if (!booking) {
    throw new HttpError(404, 'Booking not found.');
  }

  if (booking.status !== BOOKING_STATUS.AWAITING_RETURN) {
    throw new HttpError(400, 'Booking is not awaiting return.');
  }

  booking.status = BOOKING_STATUS.COMPLETED;
  await booking.save();
  await setCarStatus(booking.carId, BOOKING_STATUS.COMPLETED);

  res.json({
    success: true,
    message: 'Booking marked as completed.',
    data: booking,
  });
});

const markAwaitingReturn = asyncHandler(async (req, res) => {
  const bookingId = Number(req.params.id);
  const booking = await Booking.findOne({ id: bookingId });
  if (!booking) {
    throw new HttpError(404, 'Booking not found.');
  }

  if (![BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACTIVE].includes(booking.status)) {
    throw new HttpError(400, 'Only confirmed or active bookings can be moved to awaiting return.');
  }

  booking.status = BOOKING_STATUS.AWAITING_RETURN;
  await booking.save();
  await setCarStatus(booking.carId, booking.status);

  res.json({
    success: true,
    message: 'Booking marked as awaiting return.',
    data: booking,
  });
});

module.exports = {
  createPaymentOrder,
  verifyPaymentAndCreateBooking,
  getMyBookings,
  cancelMyBooking,
  rateMyBooking,
  getBookedRangesForCar,
  listAdminBookings,
  markBookingActive,
  rejectBooking,
  markAwaitingReturn,
  completeBooking,
};
