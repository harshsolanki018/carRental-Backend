const Razorpay = require('razorpay');
const env = require('../config/env');

const razorpay = new Razorpay({
  key_id: env.razorpayKeyId,
  key_secret: env.razorpayKeySecret,
});

module.exports = {
  razorpay,
};
