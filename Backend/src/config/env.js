const dotenv = require('dotenv');

dotenv.config();

function getRequiredEnv(name, options = {}) {
  const value = String(process.env[name] || '').trim();
  const disallowedValues = options.disallowedValues || [];

  if (!value) {
    throw new Error(`[Config] Missing required environment variable: ${name}`);
  }

  if (disallowedValues.includes(value)) {
    throw new Error(
      `[Config] Unsafe value for ${name}. Please set a strong secret/password in Backend/.env`
    );
  }

  return value;
}

function isStrongPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

const seedAdminPassword = getRequiredEnv('DATA_SEED_ADMIN_PASSWORD', {
  disallowedValues: ['Admin@123'],
});

if (!isStrongPassword(seedAdminPassword)) {
  throw new Error(
    '[Config] DATA_SEED_ADMIN_PASSWORD must be strong (8+ chars with upper, lower, number, special).'
  );
}

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  httpLogs: String(process.env.HTTP_LOGS || 'false').toLowerCase() === 'true',
  mongodbUri: getRequiredEnv('MONGODB_URI'),
  jwtSecret: getRequiredEnv('JWT_SECRET', {
    disallowedValues: ['change-this-in-production'],
  }),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  authCookieName: process.env.AUTH_COOKIE_NAME || 'car2go_auth',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:4200',
  seedAdminEmail: process.env.DATA_SEED_ADMIN_EMAIL || 'admin@car2go.com',
  seedAdminPassword,
  razorpayKeyId: getRequiredEnv('RAZORPAY_KEY_ID'),
  razorpayKeySecret: getRequiredEnv('RAZORPAY_KEY_SECRET'),
  cloudinaryCloudName: getRequiredEnv('CLOUDINARY_CLOUD_NAME'),
  cloudinaryApiKey: getRequiredEnv('CLOUDINARY_API_KEY'),
  cloudinaryApiSecret: getRequiredEnv('CLOUDINARY_API_SECRET'),
};

module.exports = env;
