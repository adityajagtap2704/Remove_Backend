const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');

// Create new booking
router.post('/', auth, bookingController.createBooking);

// Get user's booking history
router.get('/history', auth, bookingController.getBookingHistory);

// Get booking by ID
router.get('/:id', auth, bookingController.getBookingById);

// Update booking status
router.put('/:id/status', auth, bookingController.updateBookingStatus);

// Cancel booking
router.put('/:id/cancel', auth, bookingController.cancelBooking);

// Get active booking
router.get('/active/current', auth, bookingController.getActiveBooking);

// Rate and review booking
router.post('/:id/review', auth, bookingController.rateBooking);

// Get booking receipt
router.get('/:id/receipt', auth, bookingController.getBookingReceipt);

// Estimate fare
router.post('/estimate', auth, bookingController.estimateFare);

// Schedule booking
router.post('/schedule', auth, bookingController.scheduleBooking);

// Get scheduled bookings
router.get('/scheduled/list', auth, bookingController.getScheduledBookings);

module.exports = router;