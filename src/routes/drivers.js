const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Get driver profile
router.get('/profile', auth, roleCheck(['driver']), driverController.getProfile);

// Update driver profile
router.put('/profile', auth, roleCheck(['driver']), driverController.updateProfile);

// Update driver location
router.put('/location', auth, roleCheck(['driver']), driverController.updateLocation);

// Update driver availability
router.put('/availability', auth, roleCheck(['driver']), driverController.updateAvailability);

// Get driver earnings
router.get('/earnings', auth, roleCheck(['driver']), driverController.getEarnings);

// Get driver ride history
router.get('/rides', auth, roleCheck(['driver']), driverController.getRideHistory);

// Get nearby rides
router.get('/nearby-rides', auth, roleCheck(['driver']), driverController.getNearbyRides);

// Accept ride request
router.post('/accept-ride/:rideId', auth, roleCheck(['driver']), driverController.acceptRide);

// Start ride
router.put('/start-ride/:rideId', auth, roleCheck(['driver']), driverController.startRide);

// Complete ride
router.put('/complete-ride/:rideId', auth, roleCheck(['driver']), driverController.completeRide);

// Cancel ride
router.put('/cancel-ride/:rideId', auth, roleCheck(['driver']), driverController.cancelRide);

// Update vehicle information
router.put('/vehicle', auth, roleCheck(['driver']), driverController.updateVehicle);

// Upload driver documents
router.post('/documents', auth, roleCheck(['driver']), driverController.uploadDocuments);

module.exports = router;