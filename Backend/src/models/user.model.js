const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES } = require('../constants/enums');
const { generateUserId } = require('../utils/id-generator');

const userSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    blocked: { type: Boolean, default: false },
    joinDate: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('validate', function generateCustomId(next) {
  if (!this.id) {
    this.id = generateUserId();
  }
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    next();
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(rawPassword) {
  return bcrypt.compare(rawPassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    blocked: this.blocked,
    joinDate: this.joinDate,
    lastLogin: this.lastLogin,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
