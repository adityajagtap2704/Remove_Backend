const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Register user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Logout user
router.post('/logout', auth, authController.logout);

// Get current user
router.get('/me', auth, authController.getCurrentUser);

// Refresh token
router.post('/refresh-token', authController.refreshToken);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

// Verify email
router.post('/verify-email', authController.verifyEmail);

// Resend verification email
router.post('/resend-verification', authController.resendVerification);

module.exports = router;