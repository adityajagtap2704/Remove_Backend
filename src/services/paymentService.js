const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  // Create payment intent for booking
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      return {
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        paymentMethod: paymentIntent.payment_method
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process refund
  async processRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        payment_intent: paymentIntentId,
        reason
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create customer for recurring payments
  async createCustomer(email, name, metadata = {}) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata
      });

      return {
        success: true,
        customerId: customer.id
      };
    } catch (error) {
      console.error('Customer creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Add payment method to customer
  async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return { success: true };
    } catch (error) {
      console.error('Payment method attachment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate platform fee (for driver payouts)
  calculatePlatformFee(amount, feePercentage = 20) {
    const platformFee = (amount * feePercentage) / 100;
    const driverAmount = amount - platformFee;
    
    return {
      totalAmount: amount,
      platformFee: Number(platformFee.toFixed(2)),
      driverAmount: Number(driverAmount.toFixed(2)),
      feePercentage
    };
  }

  // Simulate cash payment processing
  async processCashPayment(bookingId, amount, metadata = {}) {
    try {
      // In a real implementation, this might update payment status
      // and create a record for cash collection
      return {
        success: true,
        paymentId: `cash_${Date.now()}`,
        amount,
        method: 'cash',
        status: 'completed',
        bookingId,
        metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process tip payment
  async processTip(paymentIntentId, tipAmount, metadata = {}) {
    try {
      const tipIntent = await stripe.paymentIntents.create({
        amount: Math.round(tipAmount * 100),
        currency: 'usd',
        metadata: {
          ...metadata,
          type: 'tip',
          original_payment: paymentIntentId
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: tipIntent.client_secret,
        paymentIntentId: tipIntent.id
      };
    } catch (error) {
      console.error('Tip processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate payment method
  validatePaymentMethod(method) {
    const validMethods = ['card', 'cash', 'wallet'];
    return validMethods.includes(method);
  }

  // Format amount for display
  formatAmount(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}

module.exports = new PaymentService();