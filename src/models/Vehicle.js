const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  make: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['sedan', 'suv', 'hatchback', 'luxury'],
    default: 'sedan'
  },
  capacity: {
    type: Number,
    default: 4
  },
  features: {
    airConditioning: { type: Boolean, default: true },
    wifi: { type: Boolean, default: false },
    musicSystem: { type: Boolean, default: true },
    gps: { type: Boolean, default: true }
  },
  insurance: {
    provider: String,
    policyNumber: String,
    expiryDate: Date
  },
  registration: {
    number: String,
    expiryDate: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);