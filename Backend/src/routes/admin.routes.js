const express = require('express');
const { requireAdmin } = require('../middlewares/auth.middleware');
const {
  listAdminBookings,
  markBookingActive,
  rejectBooking,
  markAwaitingReturn,
  completeBooking,
} = require('../controllers/bookings.controller');
const {
  listUsers,
  toggleUserBlock,
  deleteUser,
} = require('../controllers/users.controller');
const {
  listMessages,
  updateMessageStatus,
  deleteMessage,
} = require('../controllers/messages.controller');
const {
  getAdminHomeFeaturedCars,
  saveAdminHomeFeaturedCars,
  clearAdminHomeFeaturedCars,
} = require('../controllers/home.controller');
const { getAdminStats, getAdminDashboard } = require('../controllers/stats.controller');
const {
  createCar,
  updateCar,
  toggleMaintenance,
  deleteCar,
} = require('../controllers/cars.controller');
const { uploadCarImage } = require('../controllers/uploads.controller');
const { uploadSingleImage } = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/stats', getAdminStats);

router.get('/bookings', listAdminBookings);
router.patch('/bookings/:id/activate', markBookingActive);
router.patch('/bookings/:id/awaiting-return', markAwaitingReturn);
router.patch('/bookings/:id/reject', rejectBooking);
router.patch('/bookings/:id/complete', completeBooking);

router.get('/users', listUsers);
router.patch('/users/:id/toggle-block', toggleUserBlock);
router.delete('/users/:id', deleteUser);

router.get('/messages', listMessages);
router.patch('/messages/:ticketId/status', updateMessageStatus);
router.delete('/messages/:ticketId', deleteMessage);

router.get('/home-cars', getAdminHomeFeaturedCars);
router.put('/home-cars', saveAdminHomeFeaturedCars);
router.delete('/home-cars', clearAdminHomeFeaturedCars);

router.post('/cars', createCar);
router.put('/cars/:id', updateCar);
router.patch('/cars/:id/toggle-maintenance', toggleMaintenance);
router.delete('/cars/:id', deleteCar);

router.post('/uploads/car-image', uploadSingleImage('image'), uploadCarImage);

module.exports = router;
