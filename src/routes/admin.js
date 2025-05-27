const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get dashboard statistics
router.get('/dashboard', auth, roleCheck(['admin']), adminController.getDashboardStats);

// Get all users with pagination
router.get('/users', auth, roleCheck(['admin']), adminController.getAllUsers);

// Update user status
router.put('/users/:userId/status', auth, roleCheck(['admin']), adminController.updateUserStatus);

// Delete user
router.delete('/users/:userId', auth, roleCheck(['admin']), adminController.deleteUser);

// Get system reports
router.get('/reports', auth, roleCheck(['admin']), adminController.getReports);

// Get all drivers
router.get('/drivers', auth, roleCheck(['admin']), adminController.getAllDrivers);

// Approve/reject driver application
router.put('/drivers/:driverId/status', auth, roleCheck(['admin']), adminController.updateDriverStatus);

// Get all bookings
router.get('/bookings', auth, roleCheck(['admin']), adminController.getAllBookings);

// Get system analytics
router.get('/analytics', auth, roleCheck(['admin']), adminController.getAnalytics);

// Manage pricing
router.put('/pricing', auth, roleCheck(['admin']), adminController.updatePricing);

// Send system notification
router.post('/notifications', auth, roleCheck(['admin']), adminController.sendSystemNotification);

// Get support tickets
router.get('/support', auth, roleCheck(['admin']), adminController.getSupportTickets);

module.exports = router;