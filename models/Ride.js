const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Rider ID is required']
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  pickup: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && 
                   coords[1] >= -90 && coords[1] <= 90;
          },
          message: 'Invalid pickup coordinates'
        }
      }
    },
    address: {
      type: String,
      required: [true, 'Pickup address is required']
    },
    landmark: String,
    instructions: String
  },
  destination: {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && 
                   coords[1] >= -90 && coords[1] <= 90;
          },
          message: 'Invalid destination coordinates'
        }
      }
    },
    address: {
      type: String,
      required: [true, 'Destination address is required']
    },
    landmark: String,
    instructions: String
  },
  status: {
    type: String,
    enum: [
      'requested',      // Ride requested by rider
      'searching',      // Looking for nearby drivers
      'accepted',       // Driver accepted the ride
      'driver_arriving', // Driver is on the way to pickup
      'arrived',        // Driver arrived at pickup location
      'started',        // Ride started (rider picked up)
      'completed',      // Ride completed successfully
      'cancelled',      // Ride cancelled
      'expired'         // Ride request expired
    ],
    default: 'requested'
  },
  rideType: {
    type: String,
    enum: ['economy', 'premium', 'luxury', 'shared'],
    default: 'economy'
  },
  vehicleType: {
    type: String,
    enum: ['sedan', 'suv', 'hatchback', 'luxury', 'economy'],
    required: true
  },
  passengers: {
    type: Number,
    default: 1,
    min: [1, 'At least 1 passenger required'],
    max: [8, 'Maximum 8 passengers allowed']
  },
  scheduledTime: {
    type: Date,
    default: null // null means immediate ride
  },
  estimatedDistance: {
    type: Number, // in kilometers
    required: true,
    min: [0, 'Distance cannot be negative']
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true,
    min: [0, 'Duration cannot be negative']
  },
  actualDistance: {
    type: Number, // in kilometers
    default: 0
  },
  actualDuration: {
    type: Number, // in minutes
    default: 0
  },
  pricing: {
    baseFare: {
      type: Number,
      required: true,
      min: [0, 'Base fare cannot be negative']
    },
    perKmRate: {
      type: Number,
      required: true,
      min: [0, 'Per km rate cannot be negative']
    },
    estimatedFare: {
      type: Number,
      required: true,
      min: [0, 'Estimated fare cannot be negative']
    },
    actualFare: {
      type: Number,
      default: 0
    },
    waitingCharges: {
      type: Number,
      default: 0
    },
    tolls: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      default: 0
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'upi'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  timeline: {
    requestedAt: {
      type: Date,
      default: Date.now
    },
    acceptedAt: Date,
    driverArrivedAt: Date,
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date
  },
  route: {
    polyline: String, // Encoded polyline for the route
    waypoints: [{
      location: {
        type: [Number] // [longitude, latitude]
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  rating: {
    riderRating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      ratedAt: Date
    },
    driverRating: {
      score: {
        type: Number,
        min: 1,
        max: 5
      },
      comment: String,
      ratedAt: Date
    }
  },
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['rider', 'driver', 'system']
    },
    reason: String,
    cancelledAt: Date,
    refundAmount: {
      type: Number,
      default: 0
    }
  },
  specialRequests: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    childSeat: {
      type: Boolean,
      default: false
    },
    petFriendly: {
      type: Boolean,
      default: false
    },
    notes: String
  },
  driverOffers: [{
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    offeredAt: {
      type: Date,
      default: Date.now
    },
    estimatedArrival: Number, // minutes
    quotedFare: Number,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired'],
      default: 'pending'
    }
  }],
  otp: {
    code: {
      type: String,
      length: 4
    },
    generatedAt: Date,
    verified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
rideSchema.index({ riderId: 1 });
rideSchema.index({ driverId: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ createdAt: -1 });
rideSchema.index({ 'pickup.location': '2dsphere' });
rideSchema.index({ 'destination.location': '2dsphere' });
rideSchema.index({ scheduledTime: 1 });
rideSchema.index({ paymentStatus: 1 });

// Virtual for ride duration
rideSchema.virtual('rideDuration').get(function() {
  if (this.timeline.startedAt && this.timeline.completedAt) {
    return Math.round((this.timeline.completedAt - this.timeline.startedAt) / (1000 * 60)); // minutes
  }
  return 0;
});

// Virtual for total waiting time
rideSchema.virtual('waitingTime').get(function() {
  let waitingTime = 0;
  if (this.timeline.acceptedAt && this.timeline.startedAt) {
    waitingTime = Math.round((this.timeline.startedAt - this.timeline.acceptedAt) / (1000 * 60));
  }
  return waitingTime;
});

// Pre-save middleware
rideSchema.pre('save', function(next) {
  // Generate OTP when ride is accepted
  if (this.isModified('status') && this.status === 'accepted' && !this.otp.code) {
    this.otp = {
      code: Math.floor(1000 + Math.random() * 9000).toString(),
      generatedAt: new Date(),
      verified: false
    };
  }

  // Update timeline based on status changes
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'accepted':
        if (!this.timeline.acceptedAt) this.timeline.acceptedAt = now;
        break;
      case 'arrived':
        if (!this.timeline.driverArrivedAt) this.timeline.driverArrivedAt = now;
        break;
      case 'started':
        if (!this.timeline.startedAt) this.timeline.startedAt = now;
        break;
      case 'completed':
        if (!this.timeline.completedAt) this.timeline.completedAt = now;
        this.paymentStatus = this.paymentMethod === 'cash' ? 'completed' : 'pending';
        break;
      case 'cancelled':
        if (!this.timeline.cancelledAt) this.timeline.cancelledAt = now;
        break;
    }
  }

  // Calculate final amount
  if (this.status === 'completed' && this.pricing.actualFare > 0) {
    this.pricing.finalAmount = this.pricing.actualFare + 
                              this.pricing.waitingCharges + 
                              this.pricing.tolls - 
                              this.pricing.discount;
  }

  next();
});

// Instance methods
rideSchema.methods.updateStatus = function(newStatus, userId = null, reason = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  if (newStatus === 'cancelled') {
    this.cancellation = {
      cancelledBy: userId ? 'rider' : 'driver', // Simplified logic
      reason: reason,
      cancelledAt: new Date()
    };
  }
  
  return this.save();
};

rideSchema.methods.addRating = function(userType, rating, comment) {
  if (userType === 'rider') {
    this.rating.riderRating = {
      score: rating,
      comment: comment,
      ratedAt: new Date()
    };
  } else if (userType === 'driver') {
    this.rating.driverRating = {
      score: rating,
      comment: comment,
      ratedAt: new Date()
    };
  }
  return this.save();
};

rideSchema.methods.addWaypoint = function(longitude, latitude) {
  this.route.waypoints.push({
    location: [longitude, latitude],
    timestamp: new Date()
  });
  return this.save();
};

rideSchema.methods.verifyOTP = function(otpCode) {
  if (this.otp.code === otpCode) {
    this.otp.verified = true;
    return true;
  }
  return false;
};

// Static methods
rideSchema.statics.findActiveRides = function(userId, userType) {
  const query = {
    status: { $in: ['accepted', 'driver_arriving', 'arrived', 'started'] }
  };
  
  if (userType === 'rider') {
    query.riderId = userId;
  } else if (userType === 'driver') {
    query.driverId = userId;
  }
  
  return this.find(query)
    .populate('riderId', 'name phone')
    .populate('driverId', 'userId vehicle')
    .populate({
      path: 'driverId',
      populate: {
        path: 'userId',
        select: 'name phone'
      }
    });
};

rideSchema.statics.findNearbyRides = function(longitude, latitude, radius = 5000) {
  return this.find({
    status: 'searching',
    'pickup.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radius
      }
    }
  }).populate('riderId', 'name phone rating');
};

rideSchema.statics.getRideHistory = function(userId, userType, page = 1, limit = 10) {
  const query = {
    status: { $in: ['completed', 'cancelled'] }
  };
  
  if (userType === 'rider') {
    query.riderId = userId;
  } else if (userType === 'driver') {
    query.driverId = userId;
  }
  
  return this.find(query)
    .populate('riderId', 'name phone')
    .populate('driverId', 'userId vehicle')
    .populate({
      path: 'driverId',
      populate: {
        path: 'userId',
        select: 'name phone'
      }
    })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
};

module.exports = mongoose.model('Ride', rideSchema);