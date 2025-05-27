const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  licenseExpiry: {
    type: Date,
    required: true
  },
  experience: {
    type: Number,
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  earnings: {
    total: { type: Number, default: 0 },
    current_month: { type: Number, default: 0 },
    last_month: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'busy', 'suspended'],
    default: 'offline'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  documents: {
    license: String,
    insurance: String,
    registration: String,
    photo: String
  },
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  bankDetails: {
    accountNumber: String,
    routingNumber: String,
    accountHolderName: String,
    bankName: String
  }
}, {
  timestamps: true
});

// Create geospatial index for location
driverSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Driver', driverSchema);