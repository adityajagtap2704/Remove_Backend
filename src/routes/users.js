const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Get user profile
router.get('/profile', auth, userController.getProfile);

// Update user profile
router.put('/profile', auth, userController.updateProfile);

// Update user password
router.put('/password', auth, userController.updatePassword);

// Upload user avatar
router.post('/avatar', auth, userController.uploadAvatar);

// Delete user account
router.delete('/account', auth, userController.deleteAccount);

// Get user notifications
router.get('/notifications', auth, userController.getNotifications);

// Mark notification as read
router.put('/notifications/:id/read', auth, userController.markNotificationRead);

// Get user's favorite locations
router.get('/favorites', auth, userController.getFavoriteLocations);

// Add favorite location
router.post('/favorites', auth, userController.addFavoriteLocation);

// Remove favorite location
router.delete('/favorites/:id', auth, userController.removeFavoriteLocation);

module.exports = router;