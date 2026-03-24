const express = require('express');
const {
  getHomeFeaturedCars,
  getHomeStatusBar,
} = require('../controllers/home.controller');

const router = express.Router();

router.get('/featured-cars', getHomeFeaturedCars);
router.get('/status-bar', getHomeStatusBar);

module.exports = router;
