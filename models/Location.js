const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userType: {
    type: String,
    enum: ['rider', 'driver'],
    required: true
  },
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
        message: 'Invalid coordinates'
      }
    }
  },
  address: {
    formatted: String,
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    landmark: String
  },
  accuracy: {
    type: Number, // in meters
    default: 0
  },
  speed: {
    type: Number, // in km/h
    default: 0
  },
  heading: {
    type: Number, // in degrees (0-360)
    default: 0
  },
  altitude: {
    type: Number, // in meters
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    enum: ['gps', 'network', 'manual'],
    default: 'gps'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  networkType: {
    type: String,
    enum: ['wifi', '4g', '3g', '2g', 'unknown']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for geospatial queries and performance
locationSchema.index({ location: '2dsphere' });
locationSchema.index({ userId: 1, createdAt: -1 });
locationSchema.index({ userType: 1, isActive: 1 });
locationSchema.index({ createdAt: -1 });

// TTL index to automatically remove old location records (after 7 days)
locationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

// Virtual for formatted location display
locationSchema.virtual('displayLocation').get(function() {
  const [lng, lat] = this.location.coordinates;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
});

// Virtual for full address
locationSchema.virtual('fullAddress').get(function() {
  if (!this.address) return 'Address not available';
  const { street, city, state, country } = this.address;
  return [street, city, state, country].filter(Boolean).join(', ');
});

// Static methods
locationSchema.statics.findNearbyUsers = function(longitude, latitude, userType, radius = 5000) {
  return this.find({
    userType: userType,
    isActive: true,
    location: {
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

locationSchema.statics.getUserLocationHistory = function(userId, hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    userId: userId,
    createdAt: { $gte: startTime }
  }).sort({ createdAt: -1 });
};

locationSchema.statics.getActiveDriversInArea = function(bounds, limit = 50) {
  // bounds should be { southwest: [lng, lat], northeast: [lng, lat] }
  return this.find({
    userType: 'driver',
    isActive: true,
    location: {
      $geoWithin: {
        $box: [bounds.southwest, bounds.northeast]
      }
    }
  })
  .populate('userId', 'name phone rating')
  .limit(limit)
  .sort({ createdAt: -1 });
};

locationSchema.statics.updateUserLocation = async function(userId, userType, locationData) {
  // Deactivate previous locations
  await this.updateMany(
    { userId: userId, isActive: true },
    { isActive: false }
  );

  // Create new location record
  return this.create({
    userId: userId,
    userType: userType,
    ...locationData,
    isActive: true
  });
};

locationSchema.statics.getLatestLocation = function(userId) {
  return this.findOne({
    userId: userId,
    isActive: true
  }).sort({ createdAt: -1 });
};

// Instance methods
locationSchema.methods.calculateDistance = function(otherLocation) {
  const [lng1, lat1] = this.location.coordinates;
  const [lng2, lat2] = otherLocation.coordinates || otherLocation;

  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

locationSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.model('Location', locationSchema);