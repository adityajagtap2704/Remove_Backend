const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'cash', 'wallet', 'upi']
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  paymentDetails: {
    cardLast4: String,
    cardBrand: String,
    receiptUrl: String
  },
  commission: {
    amount: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 20 // 20% commission
    }
  },
  driverEarnings: {
    type: Number,
    default: 0
  },
  refund: {
    amount: {
      type: Number,
      default: 0
    },
    reason: String,
    refundedAt: Date,
    refundId: String
  },
  metadata: {
    tip: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    taxes: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ driverId: 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate driver earnings
paymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('commission')) {
    const commissionAmount = (this.amount * this.commission.percentage) / 100;
    this.commission.amount = commissionAmount;
    this.driverEarnings = this.amount - commissionAmount;
  }
  next();
});

// Virtual for total amount including tip
paymentSchema.virtual('totalAmount').get(function() {
  return this.amount + (this.metadata.tip || 0);
});

// Methods
paymentSchema.methods.processPayment = async function() {
  this.paymentStatus = 'processing';
  await this.save();
  // Integration with payment gateway would go here
};

paymentSchema.methods.completePayment = async function(transactionId, paymentDetails = {}) {
  this.paymentStatus = 'completed';
  this.transactionId = transactionId;
  this.paymentDetails = { ...this.paymentDetails, ...paymentDetails };
  await this.save();
};

paymentSchema.methods.failPayment = async function(reason) {
  this.paymentStatus = 'failed';
  this.metadata.failureReason = reason;
  await this.save();
};

paymentSchema.methods.processRefund = async function(amount, reason) {
  this.refund.amount = amount;
  this.refund.reason = reason;
  this.refund.refundedAt = new Date();
  this.paymentStatus = 'refunded';
  await this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);