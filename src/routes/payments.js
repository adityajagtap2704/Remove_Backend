const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Create payment intent
router.post('/create-intent', auth, paymentController.createPaymentIntent);

// Confirm payment
router.post('/confirm', auth, paymentController.confirmPayment);

// Handle failed payment
router.post('/failed', auth, paymentController.handleFailedPayment);

// Get user payment history
router.get('/history', auth, paymentController.getUserPayments);

// Get driver earnings
router.get('/earnings', auth, roleCheck(['driver']), paymentController.getDriverEarnings);

// Process refund (admin only)
router.post('/refund', auth, roleCheck(['admin']), paymentController.processRefund);

// Add tip to payment
router.post('/tip', auth, paymentController.addTip);

// Get payment by ID
router.get('/:id', auth, paymentController.getPaymentById);

module.exports = router;