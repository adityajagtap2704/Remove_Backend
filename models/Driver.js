const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },
  licenseExpiry: {
    type: Date,
    required: [true, 'License expiry date is required'],
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'License must not be expired'
    }
  },
  vehicle: {
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true
    },
    year: {
      type: Number,
      required: [true, 'Vehicle year is required'],
      min: [1980, 'Vehicle year must be after 1980'],
      max: [new Date().getFullYear() + 1, 'Vehicle year cannot be in the future']
    },
    color: {
      type: String,
      required: [true, 'Vehicle color is required'],
      trim: true
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: ['sedan', 'suv', 'hatchback', 'luxury', 'economy'],
      required: [true, 'Vehicle type is required']
    },
    capacity: {
      type: Number,
      required: [true, 'Vehicle capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [8, 'Capacity cannot exceed 8']
    },
    photos: [{
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  documents: {
    licensePhoto: {
      front: String,
      back: String
    },
    vehicleRegistration: String,
    insurance: String,
    permit: String
  },
  bankDetails: {
    accountNumber: {
      type: String,
      select: false
    },
    ifscCode: {
      type: String,
      select: false
    },
    accountHolderName: String,
    bankName: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isAvailable: {
    type: Boolean,
    default: false
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && 
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    },
    address: String,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  serviceArea: {
    radius: {
      type: Number,
      default: 10, // km
      min: [1, 'Service radius must be at least 1 km'],
      max: [50, 'Service radius cannot exceed 50 km']
    },
    cities: [{
      type: String,
      trim: true
    }]
  },
  pricing: {
    perKm: {
      type: Number,
      default: 10, // per km rate
      min: [0, 'Rate cannot be negative']
    },
    baseFare: {
      type: Number,
      default: 20,
      min: [0, 'Base fare cannot be negative']
    },
    waitingCharges: {
      type: Number,
      default: 2, // per minute
      min: [0, 'Waiting charges cannot be negative']
    }
  },
  statistics: {
    totalRides: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalDistance: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    ratingCount: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    cancelledRides: {
      type: Number,
      default: 0
    }
  },
  workingHours: {
    start: {
      type: String,
      default: '06:00'
    },
    end: {
      type: String,
      default: '22:00'
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  verificationDate: Date,
  lastActiveLocation: {
    coordinates: [Number],
    timestamp: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for geospatial queries and performance
driverSchema.index({ 'currentLocation': '2dsphere' });
driverSchema.index({ userId: 1 });
driverSchema.index({ status: 1 });
driverSchema.index({ isOnline: 1, isAvailable: 1 });
driverSchema.index({ 'vehicle.plateNumber': 1 });
driverSchema.index({ licenseNumber: 1 });
driverSchema.index({ 'statistics.averageRating': -1 });

// Virtual for vehicle display name
driverSchema.virtual('vehicleInfo').get(function() {
  if (!this.vehicle) return '';
  const { make, model, year, color, plateNumber } = this.vehicle;
  return `${year} ${make} ${model} (${color}) - ${plateNumber}`;
});

// Virtual for full address
driverSchema.virtual('locationAddress').get(function() {
  return this.currentLocation?.address || 'Location not available';
});

// Pre-save middleware
driverSchema.pre('save', function(next) {
  // Update completion rate
  if (this.statistics.totalRides > 0) {
    const completedRides = this.statistics.totalRides - this.statistics.cancelledRides;
    this.statistics.completionRate = (completedRides / this.statistics.totalRides) * 100;
  }
  next();
});

// Instance methods
driverSchema.methods.updateLocation = function(longitude, latitude, address) {
  this.currentLocation = {
    type: 'Point',
    coordinates: [longitude, latitude],
    address: address,
    lastUpdated: new Date()
  };
  this.lastActiveLocation = {
    coordinates: [longitude, latitude],
    timestamp: new Date()
  };
  return this.save();
};

driverSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.statistics.averageRating * this.statistics.ratingCount;
  this.statistics.ratingCount += 1;
  this.statistics.averageRating = (currentTotal + newRating) / this.statistics.ratingCount;
  return this.save();
};

driverSchema.methods.goOnline = function() {
  this.isOnline = true;
  this.isAvailable = true;
  return this.save();
};

driverSchema.methods.goOffline = function() {
  this.isOnline = false;
  this.isAvailable = false;
  return this.save();
};

driverSchema.methods.setAvailability = function(available) {
  this.isAvailable = available && this.isOnline;
  return this.save();
};

// Static methods
driverSchema.statics.findNearbyDrivers = function(longitude, latitude, radius = 5000) {
  return this.find({
    status: 'approved',
    isOnline: true,
    isAvailable: true,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radius // meters
      }
    }
  }).populate('userId', 'name phone rating');
};

driverSchema.statics.findByVehicleType = function(vehicleType, longitude, latitude, radius = 5000) {
  return this.find({
    status: 'approved',
    isOnline: true,
    isAvailable: true,
    'vehicle.type': vehicleType,
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radius
      }
    }
  }).populate('userId', 'name phone rating');
};

driverSchema.statics.getDriverStats = function(driverId) {
  return this.findById(driverId).select('statistics');
};

module.exports = mongoose.model('Driver', driverSchema);