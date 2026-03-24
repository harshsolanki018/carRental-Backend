const Car = require('../models/car.model');
const Booking = require('../models/booking.model');
const User = require('../models/user.model');
const asyncHandler = require('../utils/async-handler');
const { BOOKING_STATUS, CAR_STATUS } = require('../constants/enums');

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function percent(part, total) {
  if (!total) {
    return 0;
  }
  return Number(((part / total) * 100).toFixed(1));
}

function formatCurrency(amount) {
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

function parseDateCandidate(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getBookingDate(booking) {
  const candidates = [
    booking.createdAt,
    booking.updatedAt,
    booking.pickupDate,
    booking.id,
  ];

  for (const candidate of candidates) {
    const parsed = parseDateCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getRangeWindow(rangeKey) {
  const now = new Date();
  const start = new Date(now);

  if (rangeKey === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (rangeKey === '7d') {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}

const getAdminStats = asyncHandler(async (req, res) => {
  const selectedRange = ['today', '7d', '30d'].includes(req.query.range)
    ? req.query.range
    : '30d';

  const [cars, allBookings, users] = await Promise.all([
    Car.find(),
    Booking.find(),
    User.find(),
  ]);

  const { start, end } = getRangeWindow(selectedRange);
  const bookings = allBookings.filter((booking) => {
    const bookingDate = getBookingDate(booking);
    if (!bookingDate) {
      return false;
    }
    return bookingDate >= start && bookingDate <= end;
  });

  const availableCars = cars.filter(
    (c) => c.status === CAR_STATUS.AVAILABLE
  ).length;
  const bookedCars = cars.filter((c) => c.status === CAR_STATUS.BOOKED).length;
  const maintenanceCars = cars.filter(
    (c) => c.status === CAR_STATUS.MAINTENANCE
  ).length;

  const confirmed = bookings.filter((b) => b.status === BOOKING_STATUS.CONFIRMED);
  const active = bookings.filter((b) => b.status === BOOKING_STATUS.ACTIVE);
  const awaitingReturn = bookings.filter(
    (b) => b.status === BOOKING_STATUS.AWAITING_RETURN
  );
  const completed = bookings.filter(
    (b) => b.status === BOOKING_STATUS.COMPLETED
  );
  const paid = bookings.filter((b) => b.paymentStatus === 'Success');
  const rejected = bookings.filter((b) => b.status === BOOKING_STATUS.REJECTED);

  const totalRevenue = completed
    .filter((b) => b.paymentStatus === 'Success')
    .reduce(
      (sum, b) => sum + toNumber(b.totalPrice),
      0
    );

  const ratings = completed
    .map((b) => toNumber(b.rating))
    .filter((rating) => rating > 0);

  const overallRating =
    ratings.length > 0
      ? Number(
          (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        )
      : 0;

  const activeUsersEmails = [
    ...new Set(
      bookings
        .map((b) => String(b.userEmail || '').trim())
        .filter((email) => email.length > 0)
    ),
  ];

  const bookingsPerUser = {};
  const bookingsPerCar = {};
  const carNameById = new Map(cars.map((car) => [car.id, (car.name || '').trim()]));

  bookings.forEach((b) => {
    const email = String(b.userEmail || '').trim();
    if (email) {
      bookingsPerUser[email] = (bookingsPerUser[email] || 0) + 1;
    }

    const carId = Number(b.carId);
    const bookingCarName = String(b.carName || '').trim();
    const fallbackName =
      Number.isFinite(carId) && carId > 0
        ? carNameById.get(carId) || `Car #${carId}`
        : bookingCarName || 'Unknown Car';
    const carKey =
      Number.isFinite(carId) && carId > 0
        ? `id:${carId}`
        : `name:${fallbackName.toLowerCase()}`;

    if (!bookingsPerCar[carKey]) {
      bookingsPerCar[carKey] = {
        label: fallbackName,
        count: 0,
      };
    }

    bookingsPerCar[carKey].count += 1;
  });

  const topUsers = Object.entries(bookingsPerUser)
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const topCars = Object.values(bookingsPerCar)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalCars = cars.length;
  const totalBookings = bookings.length;
  const totalUsers = users.length;

  const response = {
    selectedRange,
    rangeStartDisplay: start.toLocaleDateString(),
    rangeEndDisplay: end.toLocaleDateString(),
    totalBookingsAll: allBookings.length,
    lastUpdated: new Date().toLocaleString(),
    revenueDisplay: formatCurrency(totalRevenue),
    overview: {
      totalCars,
      availableCars,
      bookedCars,
      maintenanceCars,
      totalBookings,
      totalRevenue,
      overallRating,
      availabilityRate: percent(availableCars, totalCars),
      utilizationRate: percent(bookedCars, totalCars),
    },
    userStats: {
      totalUsers,
      activeUsers: activeUsersEmails.length,
      activeUserRate: percent(activeUsersEmails.length, totalUsers),
      avgBookingsPerUser:
        totalUsers > 0 ? Number((totalBookings / totalUsers).toFixed(1)) : 0,
    },
    bookingStats: {
      confirmed: confirmed.length,
      active: active.length,
      awaitingReturn: awaitingReturn.length,
      completed: completed.length,
      rejected: rejected.length,
      paid: paid.length,
      confirmationRate: percent(confirmed.length, totalBookings),
      activeRate: percent(active.length, totalBookings),
      awaitingReturnRate: percent(awaitingReturn.length, totalBookings),
      completionRate: percent(completed.length, totalBookings),
      paidRate: percent(paid.length, totalBookings),
      rejectionRate: percent(rejected.length, totalBookings),
    },
    topUsers,
    topCars,
  };

  res.json({
    success: true,
    data: response,
  });
});

const getAdminDashboard = asyncHandler(async (req, res) => {
  const [cars, bookings] = await Promise.all([Car.find(), Booking.find()]);

  const confirmedBookings = bookings.filter((b) => b.status === BOOKING_STATUS.CONFIRMED);
  const activeBookings = bookings.filter(
    (b) => b.status === BOOKING_STATUS.ACTIVE
  );
  const awaitingReturnBookings = bookings.filter(
    (b) => b.status === BOOKING_STATUS.AWAITING_RETURN
  );
  const completedBookings = bookings.filter(
    (b) => b.status === BOOKING_STATUS.COMPLETED
  );
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'Success');
  const rejectedBookings = bookings.filter(
    (b) => b.status === BOOKING_STATUS.REJECTED
  );

  const totalRevenue = completedBookings
    .filter((b) => b.paymentStatus === 'Success')
    .reduce(
      (sum, b) => sum + (b.totalPrice || 0),
      0
    );

  const stats = [
    { label: 'Total Cars', value: cars.length },
    { label: 'Total Bookings', value: bookings.length },
    { label: 'Confirmed Bookings', value: confirmedBookings.length },
    { label: 'Active Rentals', value: activeBookings.length },
    { label: 'Awaiting Return', value: awaitingReturnBookings.length },
    { label: 'Completed Bookings', value: completedBookings.length },
    { label: 'Paid Bookings', value: paidBookings.length },
    { label: 'Total Revenue', value: `Rs. ${totalRevenue}` },
  ];

  const carStats = cars.map((car) => {
    const carCompletedBookings = completedBookings.filter(
      (b) => b.carId === car.id
    );

    const carRevenue = carCompletedBookings.reduce(
      (sum, b) => sum + (b.totalPrice || 0),
      0
    );

    const ratings = carCompletedBookings
      .map((b) => b.rating)
      .filter((r) => r > 0);

    const avgRating =
      ratings.length > 0
        ? Number(
            (
              ratings.reduce((a, b) => a + b, 0) / ratings.length
            ).toFixed(1)
          )
        : 0;

    return {
      id: car.id,
      carNumber: car.carNumber || 'N/A',
      name: car.name,
      image: car.image,
      bookings: carCompletedBookings.length,
      revenue: carRevenue,
      avgRating,
      status: car.status,
    };
  });

  const allRatings = completedBookings
    .map((b) => b.rating)
    .filter((r) => r > 0);

  const overallRating =
    allRatings.length > 0
      ? Number((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1))
      : 0;

  res.json({
    success: true,
    data: {
      stats,
      carStats,
      overallRating,
    },
  });
});

module.exports = {
  getAdminStats,
  getAdminDashboard,
};
