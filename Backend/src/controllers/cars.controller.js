const Car = require('../models/car.model');
const Booking = require('../models/booking.model');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const { BOOKING_STATUS, CAR_STATUS } = require('../constants/enums');
const cloudinary = require('../config/cloudinary');

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

function normalizeCarPayload(payload) {
  return {
    ownerName: String(payload.ownerName || '').trim(),
    ownerContact: String(payload.ownerContact || '').trim(),
    name: String(payload.name || '').trim(),
    carNumber: String(payload.carNumber || '').trim(),
    image: String(payload.image || '').trim(),
    imagePublicId: String(payload.imagePublicId || '').trim(),
    location: String(payload.location || '').trim(),
    fuelType: String(payload.fuelType || '').trim(),
    transmission: String(payload.transmission || '').trim(),
    seats: Number(payload.seats),
    pricePerDay: Number(payload.pricePerDay),
    description: String(payload.description || '').trim(),
    status: payload.status || CAR_STATUS.AVAILABLE,
  };
}

function validateCarPayload(car) {
  if (
    !car.ownerName ||
    !car.ownerContact ||
    !car.name ||
    !car.carNumber ||
    !car.location ||
    !car.fuelType ||
    !car.transmission ||
    !car.description ||
    !Number.isFinite(car.seats) ||
    car.seats <= 0 ||
    !Number.isFinite(car.pricePerDay) ||
    car.pricePerDay < 0
  ) {
    throw new HttpError(400, 'Please fill all required fields correctly.');
  }

  if (!isValidPhone(car.ownerContact)) {
    throw new HttpError(400, 'Owner contact number must be 10 digits.');
  }
}

async function safeDeleteCloudinaryImage(publicId) {
  if (!publicId) {
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Ignore cleanup errors to avoid blocking core flows.
  }
}

const listCars = asyncHandler(async (req, res) => {
  const cars = await Car.find().sort({ id: -1 });
  const ratings = await Booking.aggregate([
    {
      $match: {
        rating: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: '$carId',
        ratingAvg: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const ratingMap = new Map(
    ratings.map((item) => [
      Number(item._id),
      {
        ratingAvg: Number(item.ratingAvg || 0),
        ratingCount: Number(item.ratingCount || 0),
      },
    ])
  );

  const carsWithRatings = cars.map((car) => {
    const rating = ratingMap.get(car.id);
    return {
      ...car.toObject(),
      ratingAvg: rating ? Number(rating.ratingAvg.toFixed(1)) : 0,
      ratingCount: rating ? rating.ratingCount : 0,
    };
  });

  res.json({ success: true, data: carsWithRatings });
});

const getCarById = asyncHandler(async (req, res) => {
  const carId = Number(req.params.id);
  const car = await Car.findOne({ id: carId });
  if (!car) {
    throw new HttpError(404, 'Car not found.');
  }
  res.json({ success: true, data: car });
});

const createCar = asyncHandler(async (req, res) => {
  const carPayload = normalizeCarPayload(req.body);
  validateCarPayload(carPayload);

  const car = new Car({
    ...carPayload,
    status: CAR_STATUS.AVAILABLE,
  });

  await car.save();
  res.status(201).json({
    success: true,
    message: 'Car added successfully.',
    data: car,
  });
});

const updateCar = asyncHandler(async (req, res) => {
  const carId = Number(req.params.id);
  const car = await Car.findOne({ id: carId });
  if (!car) {
    throw new HttpError(404, 'Car not found.');
  }

  const carPayload = normalizeCarPayload(req.body);
  validateCarPayload(carPayload);

  if (car.imagePublicId && carPayload.imagePublicId && car.imagePublicId !== carPayload.imagePublicId) {
    await safeDeleteCloudinaryImage(car.imagePublicId);
  }

  Object.assign(car, carPayload);
  await car.save();

  res.json({
    success: true,
    message: 'Car updated successfully.',
    data: car,
  });
});

const toggleMaintenance = asyncHandler(async (req, res) => {
  const carId = Number(req.params.id);
  const car = await Car.findOne({ id: carId });
  if (!car) {
    throw new HttpError(404, 'Car not found.');
  }

  const hasActiveBooking = await Booking.exists({
    carId: car.id,
    status: {
      $in: [
        BOOKING_STATUS.CONFIRMED,
        BOOKING_STATUS.ACTIVE,
        BOOKING_STATUS.AWAITING_RETURN,
      ],
    },
  });

  if (hasActiveBooking) {
    throw new HttpError(
      400,
      'This car has active bookings. It cannot be set to Maintenance.'
    );
  }

  car.status =
    car.status === CAR_STATUS.MAINTENANCE
      ? CAR_STATUS.AVAILABLE
      : CAR_STATUS.MAINTENANCE;

  await car.save();

  res.json({
    success: true,
    message:
      car.status === CAR_STATUS.MAINTENANCE
        ? 'Car moved to Maintenance.'
        : 'Car moved to Available.',
    data: car,
  });
});

const deleteCar = asyncHandler(async (req, res) => {
  const carId = Number(req.params.id);
  const car = await Car.findOne({ id: carId });
  if (!car) {
    throw new HttpError(404, 'Car not found.');
  }

  const hasAnyBooking = await Booking.exists({ carId: car.id });
  if (hasAnyBooking) {
    throw new HttpError(
      400,
      'This car has booking history and cannot be deleted.'
    );
  }

  await car.deleteOne();
  await safeDeleteCloudinaryImage(car.imagePublicId);

  res.json({
    success: true,
    message: 'Car deleted successfully.',
  });
});

module.exports = {
  listCars,
  getCarById,
  createCar,
  updateCar,
  toggleMaintenance,
  deleteCar,
};
