const User = require('../models/user.model');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');
const { USER_ROLES } = require('../constants/enums');
const { signAccessToken } = require('../services/token.service');
const env = require('../config/env');

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9]{10}$/.test(phone);
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function getAuthCookieOptions() {
  const isProd = env.nodeEnv === 'production';

  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
  };
}

const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = String(req.body.password || '');

  if (!name || !email || !phone || !password) {
    throw new HttpError(400, 'Please fill all required fields.');
  }

  if (!isValidEmail(email)) {
    throw new HttpError(400, 'Invalid email format.');
  }

  if (!isValidPhone(phone)) {
    throw new HttpError(400, 'Phone number must be 10 digits.');
  }

  if (!isStrongPassword(password)) {
    throw new HttpError(
      400,
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
    );
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, 'Email already registered.');
  }

  const user = new User({
    name,
    email,
    phone,
    password,
    role: USER_ROLES.USER,
    blocked: false,
    joinDate: new Date(),
    lastLogin: null,
  });

  await user.save();

  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: {
      user: user.toSafeObject(),
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    throw new HttpError(400, 'Please enter email and password.');
  }

  if (!isValidEmail(email)) {
    throw new HttpError(400, 'Please enter a valid email address.');
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  if (user.blocked) {
    throw new HttpError(403, 'Your account has been blocked by admin.');
  }

  user.lastLogin = new Date();
  await user.save();

  const session = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    loginTime: new Date().toISOString(),
  };

  const token = signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });

  res.cookie(env.authCookieName, token, getAuthCookieOptions());

  res.json({
    success: true,
    message: 'Login successful.',
    data: {
      session,
      user: user.toSafeObject(),
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie(env.authCookieName, getAuthCookieOptions());
  res.json({
    success: true,
    message: 'Logout successful.',
    data: null,
  });
});

const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.json({
      success: true,
      data: {
        session: null,
        user: null,
      },
    });
    return;
  }

  const session = {
    userId: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    loginTime: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: {
      session,
      user: req.user.toSafeObject(),
    },
  });
});

module.exports = {
  register,
  login,
  logout,
  me,
};
