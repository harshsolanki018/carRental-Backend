const express = require('express');
const { register, login, logout, me } = require('../controllers/auth.controller');
const { optionalAuth } = require('../middlewares/auth.middleware');
const {
  loginRateLimit,
  registerRateLimit,
} = require('../middlewares/rate-limit.middleware');

const router = express.Router();

router.post('/register', registerRateLimit, register);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);
router.get('/me', optionalAuth, me);

module.exports = router;
