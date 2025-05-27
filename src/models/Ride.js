const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  passenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  status: {
    type: String,
    enum: ['driver_assigned', 'driver_arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'driver_assigned'
  },
  timeline: {
    driverAssigned: Date,
    driverArrived: Date,
    rideStarted: Date,
    rideCompleted: Date
  },
  route: {
    startLocation: {
      coordinates: [Number],
      timestamp: Date
    },
    endLocation: {
      coordinates: [Number],
      timestamp: Date
    },
    actualDistance: Number,
    actualDuration: Number
  },
  fare: {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    waitingTime: Number,
    surge: Number,
    discount: Number,
    total: Number,
    driverEarning: Number,
    platformFee: Number
  },
  payment: {
    method: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  },
  review: {
    passengerReview: {
      rating: Number,
      comment: String,
      createdAt: Date
    },
    driverReview: {
      rating: Number,
      comment: String,
      createdAt: Date
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ride', rideSchema);