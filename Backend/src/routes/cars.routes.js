const express = require('express');
const {
  listCars,
  getCarById,
  createCar,
  updateCar,
  toggleMaintenance,
  deleteCar,
} = require('../controllers/cars.controller');
const { requireAdmin } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', listCars);
router.get('/:id', getCarById);

router.post('/', requireAdmin, createCar);
router.put('/:id', requireAdmin, updateCar);
router.patch('/:id/toggle-maintenance', requireAdmin, toggleMaintenance);
router.delete('/:id', requireAdmin, deleteCar);

module.exports = router;
