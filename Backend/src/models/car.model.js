const mongoose = require('mongoose');
const { CAR_STATUS } = require('../constants/enums');
const { Counter, getNextSequence } = require('./counter.model');

const carSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    ownerName: { type: String, required: true, trim: true },
    ownerContact: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    carNumber: { type: String, required: true, trim: true },
    image: { type: String, default: '' },
    imagePublicId: { type: String, default: '' },
    location: { type: String, required: true, trim: true },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'Electric'],
      required: true,
    },
    transmission: {
      type: String,
      enum: ['Manual', 'Automatic'],
      required: true,
    },
    seats: { type: Number, required: true, min: 1 },
    pricePerDay: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(CAR_STATUS),
      default: CAR_STATUS.AVAILABLE,
    },
  },
  { timestamps: true }
);

carSchema.pre('validate', async function generateNumericId(next) {
  if (this.id) {
    next();
    return;
  }

  let candidateId = await getNextSequence('car_id');
  const exists = await this.constructor.exists({ id: candidateId });

  if (exists) {
    const highestCar = await this.constructor.findOne({}, { id: 1 }).sort({ id: -1 });
    const maxId = Number(highestCar?.id || 0);

    if (maxId >= candidateId) {
      await Counter.findOneAndUpdate(
        { key: 'car_id' },
        { $set: { value: maxId } },
        { upsert: true }
      );
      candidateId = await getNextSequence('car_id');
    }
  }

  this.id = candidateId;
  next();
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;
