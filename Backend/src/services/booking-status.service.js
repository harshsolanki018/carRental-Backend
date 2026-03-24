const Booking = require('../models/booking.model');
const { BOOKING_STATUS } = require('../constants/enums');

function toStartOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function syncBookingStatusesByDate() {
  const candidates = await Booking.find({
    status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.ACTIVE] },
  });

  if (candidates.length === 0) {
    return 0;
  }

  const today = toStartOfDay(new Date());
  let updated = 0;

  for (const booking of candidates) {
    const pickupDate = parseDate(booking.pickupDate);
    const returnDate = parseDate(booking.returnDate);

    if (!pickupDate || !returnDate) {
      continue;
    }

    const pickupDay = toStartOfDay(pickupDate);
    const returnDay = toStartOfDay(returnDate);

    if (booking.status === BOOKING_STATUS.CONFIRMED && pickupDay <= today) {
      booking.status = BOOKING_STATUS.ACTIVE;
      await booking.save();
      updated += 1;
      continue;
    }

    if (booking.status === BOOKING_STATUS.ACTIVE && returnDay <= today) {
      booking.status = BOOKING_STATUS.AWAITING_RETURN;
      await booking.save();
      updated += 1;
    }
  }

  return updated;
}

module.exports = {
  syncBookingStatusesByDate,
};
