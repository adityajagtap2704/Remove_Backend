const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  pickup: {
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  destination: {
    address: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  rideType: {
    type: String,
    enum: ['economy', 'comfort', 'premium'],
    default: 'economy'
  },
  scheduledTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'cancelled', 'completed', 'no_drivers'],
    default: 'pending'
  },
  fare: {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    surge: { type: Number, default: 1 },
    total: Number
  },
  distance: {
    type: Number // in kilometers
  },
  estimatedDuration: {
    type: Number // in minutes
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet'],
    default: 'cash'
  },
  specialRequests: String,
  passengerCount: {
    type: Number,
    default: 1,
    min: 1,
    max: 6
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Booking', bookingSchema);