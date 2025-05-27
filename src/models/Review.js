const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'reviewerModel'
  },
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'revieweeModel'
  },
  reviewerModel: {
    type: String,
    required: true,
    enum: ['User', 'Driver']
  },
  revieweeModel: {
    type: String,
    required: true,
    enum: ['User', 'Driver']
  },
  reviewerType: {
    type: String,
    required: true,
    enum: ['passenger', 'driver']
  },
  revieweeType: {
    type: String,
    required: true,
    enum: ['passenger', 'driver']
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  },
  categories: {
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    driving: {
      type: Number,
      min: 1,
      max: 5
    },
    overall: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  adminReviewed: {
    type: Boolean,
    default: false
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    enum: ['inappropriate', 'spam', 'fake', 'offensive']
  }
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ bookingId: 1 });
reviewSchema.index({ reviewerId: 1 });
reviewSchema.index({ revieweeId: 1 });
reviewSchema.index({ reviewerType: 1 });
reviewSchema.index({ revieweeType: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index to prevent duplicate reviews
reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true });

// Virtual for reviewer name (populated)
reviewSchema.virtual('reviewerName').get(function() {
  return this.reviewerId?.name || 'Anonymous';
});

// Pre-save middleware
reviewSchema.pre('save', function(next) {
  // Set the model references based on reviewer/reviewee types
  if (this.reviewerType === 'passenger') {
    this.reviewerModel = 'User';
  } else if (this.reviewerType === 'driver') {
    this.reviewerModel = 'Driver';
  }

  if (this.revieweeType === 'passenger') {
    this.revieweeModel = 'User';
  } else if (this.revieweeType === 'driver') {
    this.revieweeModel = 'Driver';
  }

  next();
});

// Methods
reviewSchema.methods.flagReview = async function(reason) {
  this.flagged = true;
  this.flagReason = reason;
  await this.save();
};

reviewSchema.methods.unflagReview = async function() {
  this.flagged = false;
  this.flagReason = undefined;
  await this.save();
};

// Static methods
reviewSchema.statics.getAverageRating = async function(revieweeId, revieweeType) {
  const result = await this.aggregate([
    { 
      $match: { 
        revieweeId: revieweeId,
        revieweeType: revieweeType,
        flagged: false
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        categoryAverages: {
          punctuality: { $avg: '$categories.punctuality' },
          cleanliness: { $avg: '$categories.cleanliness' },
          communication: { $avg: '$categories.communication' },
          driving: { $avg: '$categories.driving' },
          overall: { $avg: '$categories.overall' }
        }
      }
    }
  ]);

  return result[0] || {
    averageRating: 0,
    totalReviews: 0,
    categoryAverages: {
      punctuality: 0,
      cleanliness: 0,
      communication: 0,
      driving: 0,
      overall: 0
    }
  };
};

reviewSchema.statics.getRatingDistribution = async function(revieweeId, revieweeType) {
  const result = await this.aggregate([
    { 
      $match: { 
        revieweeId: revieweeId,
        revieweeType: revieweeType,
        flagged: false
      }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: -1 } }
  ]);

  // Create distribution object with all ratings (1-5)
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result.forEach(item => {
    distribution[item._id] = item.count;
  });

  return distribution;
};

module.exports = mongoose.model('Review', reviewSchema);