const Booking = require('../models/booking.model');

const LEGACY_BOOKING_STATUSES = ['Pending', 'Approved'];

async function migrateLegacyBookingStatuses() {
  const result = await Booking.updateMany(
    { status: { $in: LEGACY_BOOKING_STATUSES } },
    { $set: { status: 'Confirmed' } }
  );

  return result?.modifiedCount || 0;
}

module.exports = {
  migrateLegacyBookingStatuses,
};
