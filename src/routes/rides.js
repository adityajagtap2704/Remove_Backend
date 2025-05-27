const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const auth = require('../middleware/auth');

// Get real-time ride tracking
router.get('/:id/track', auth, rideController.trackRide);

// Update ride location
router.put('/:id/location', auth, rideController.updateRideLocation);

// Get ride details
router.get('/:id', auth, rideController.getRideDetails);

// Share ride location
router.post('/:id/share', auth, rideController.shareRideLocation);

// Send message to driver/passenger
router.post('/:id/message', auth, rideController.sendMessage);

// Get ride messages
router.get('/:id/messages', auth, rideController.getRideMessages);

// Report ride issue
router.post('/:id/report', auth, rideController.reportRideIssue);

// Emergency alert
router.post('/:id/emergency', auth, rideController.emergencyAlert);

// Get ride route
router.get('/:id/route', auth, rideController.getRideRoute);

// Update ride destination
router.put('/:id/destination', auth, rideController.updateDestination);

module.exports = router;