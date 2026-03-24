const express = require('express');
const {
  createPaymentOrder,
  verifyPaymentAndCreateBooking,
  getMyBookings,
  cancelMyBooking,
  rateMyBooking,
  getBookedRangesForCar,
} = require('../controllers/bookings.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/car/:carId/ranges', requireAuth, getBookedRangesForCar);
router.post('/create-order', requireAuth, createPaymentOrder);
router.post('/verify-payment', requireAuth, verifyPaymentAndCreateBooking);
router.get('/me', requireAuth, getMyBookings);
router.patch('/:id/cancel', requireAuth, cancelMyBooking);
router.patch('/:id/rating', requireAuth, rateMyBooking);

module.exports = router;
