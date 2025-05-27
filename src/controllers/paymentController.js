const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const paymentController = {
  // Create payment intent for booking
  createPaymentIntent: async (req, res) => {
    try {
      const { bookingId, paymentMethod = 'card' } = req.body;
      const userId = req.user.id;

      const booking = await Booking.findById(bookingId).populate('driverId');
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      if (booking.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Unauthorized access to booking' });
      }

      // Check if payment already exists
      let payment = await Payment.findOne({ bookingId });
      
      if (!payment) {
        payment = new Payment({
          bookingId,
          userId,
          driverId: booking.driverId._id,
          amount: booking.fare,
          paymentMethod
        });
        await payment.save();
      }

      // Create Stripe payment intent for card payments
      if (paymentMethod === 'card') {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(payment.totalAmount * 100), // Convert to cents
          currency: payment.currency.toLowerCase(),
          metadata: {
            bookingId: bookingId,
            paymentId: payment._id.toString()
          }
        });

        payment.stripePaymentIntentId = paymentIntent.id;
        await payment.save();

        return res.json({
          clientSecret: paymentIntent.client_secret,
          paymentId: payment._id,
          amount: payment.totalAmount
        });
      }

      // For cash payments
      if (paymentMethod === 'cash') {
        payment.paymentStatus = 'pending';
        await payment.save();
        
        return res.json({
          paymentId: payment._id,
          amount: payment.totalAmount,
          message: 'Cash payment registered'
        });
      }

      res.json({
        paymentId: payment._id,
        amount: payment.totalAmount
      });

    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({ message: 'Failed to create payment intent' });
    }
  },

  // Confirm payment
  confirmPayment: async (req, res) => {
    try {
      const { paymentId, transactionId, paymentDetails } = req.body;
      
      const payment = await Payment.findById(paymentId)
        .populate('bookingId')
        .populate('userId', 'name email')
        .populate('driverId', 'name email');

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      await payment.completePayment(transactionId, paymentDetails);

      // Update booking status
      await Booking.findByIdAndUpdate(payment.bookingId._id, {
        status: 'completed',
        paymentStatus: 'paid'
      });

      res.json({
        message: 'Payment confirmed successfully',
        payment: {
          id: payment._id,
          amount: payment.amount,
          status: payment.paymentStatus,
          driverEarnings: payment.driverEarnings
        }
      });

    } catch (error) {
      console.error('Confirm payment error:', error);
      res.status(500).json({ message: 'Failed to confirm payment' });
    }
  },

  // Handle failed payment
  handleFailedPayment: async (req, res) => {
    try {
      const { paymentId, reason } = req.body;
      
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      await payment.failPayment(reason);

      // Update booking status
      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'failed'
      });

      res.json({
        message: 'Payment failure recorded',
        paymentId: payment._id
      });

    } catch (error) {
      console.error('Handle failed payment error:', error);
      res.status(500).json({ message: 'Failed to handle payment failure' });
    }
  },

  // Get payment history for user
  getUserPayments: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const query = { userId };
      if (status) query.paymentStatus = status;

      const payments = await Payment.find(query)
        .populate('bookingId', 'pickupLocation dropoffLocation createdAt')
        .populate('driverId', 'name profilePicture')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Payment.countDocuments(query);

      res.json({
        payments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });

    } catch (error) {
      console.error('Get user payments error:', error);
      res.status(500).json({ message: 'Failed to fetch payment history' });
    }
  },

  // Get driver earnings
  getDriverEarnings: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { startDate, endDate, page = 1, limit = 10 } = req.query;

      const query = { 
        driverId,
        paymentStatus: 'completed'
      };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const payments = await Payment.find(query)
        .populate('bookingId', 'pickupLocation dropoffLocation createdAt')
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const totalEarnings = await Payment.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$driverEarnings' } } }
      ]);

      const total = await Payment.countDocuments(query);

      res.json({
        payments,
        totalEarnings: totalEarnings[0]?.total || 0,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });

    } catch (error) {
      console.error('Get driver earnings error:', error);
      res.status(500).json({ message: 'Failed to fetch driver earnings' });
    }
  },

  // Process refund
  processRefund: async (req, res) => {
    try {
      const { paymentId, amount, reason } = req.body;
      
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (payment.paymentStatus !== 'completed') {
        return res.status(400).json({ message: 'Can only refund completed payments' });
      }

      // Process Stripe refund if it was a card payment
      if (payment.stripePaymentIntentId) {
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(amount * 100) // Convert to cents
        });
        
        payment.refund.refundId = refund.id;
      }

      await payment.processRefund(amount, reason);

      res.json({
        message: 'Refund processed successfully',
        refundAmount: amount,
        paymentId: payment._id
      });

    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({ message: 'Failed to process refund' });
    }
  },

  // Add tip to payment
  addTip: async (req, res) => {
    try {
      const { paymentId, tip } = req.body;
      
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      payment.metadata.tip = tip;
      payment.driverEarnings += tip; // Tip goes directly to driver
      await payment.save();

      res.json({
        message: 'Tip added successfully',
        tip,
        totalAmount: payment.totalAmount
      });

    } catch (error) {
      console.error('Add tip error:', error);
      res.status(500).json({ message: 'Failed to add tip' });
    }
  },

  // Get payment by ID
  getPaymentById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const payment = await Payment.findById(id)
        .populate('bookingId')
        .populate('userId', 'name email')
        .populate('driverId', 'name email');

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      // Check if user has access to this payment
      if (payment.userId._id.toString() !== req.user.id && 
          payment.driverId._id.toString() !== req.user.id &&
          req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(payment);

    } catch (error) {
      console.error('Get payment by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch payment' });
    }
  }
};

module.exports = paymentController;