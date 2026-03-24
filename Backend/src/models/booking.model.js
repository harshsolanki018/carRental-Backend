const mongoose = require('mongoose');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../constants/enums');
const { getNextSequence } = require('./counter.model');
const { generateBookingId } = require('../utils/id-generator');

const bookingSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    bookingId: { type: String, unique: true, index: true },
    carId: { type: Number, required: true, index: true },
    carNumber: { type: String, default: '' },
    carName: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    pickupDate: { type: String, required: true },
    returnDate: { type: String, required: true },
    totalDays: { type: Number, required: true, min: 1 },
    totalPrice: { type: Number, required: true, min: 0 },
    orderId: { type: String, unique: true, sparse: true },
    paymentId: { type: String, unique: true, sparse: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.SUCCESS,
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.CONFIRMED,
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    aadhaar: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

bookingSchema.pre('validate', async function ensureIds(next) {
  if (!this.id) {
    this.id = await getNextSequence('booking_id');
  }
  if (!this.bookingId) {
    this.bookingId = generateBookingId();
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
