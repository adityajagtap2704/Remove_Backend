const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Review = require('../models/Review');

const rideController = {
  // Get all rides for admin
  getAllRides: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, startDate, endDate } = req.query;
      
      const query = {};
      if (status) query.status = status;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const rides = await Booking.find(query)
        .populate('userId', 'name email phone')
        .populate('driverId', 'name email phone licenseNumber')
        .populate('vehicleId', 'licensePlate model make')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Booking.countDocuments(query);

      res.json({
        rides,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });

    } catch (error) {
      console.error('Get all rides error:', error);
      res.status(500).json({ message: 'Failed to fetch rides' });
    }
  },

  // Get ride by ID
  getRideById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const ride = await Booking.findById(id)
        .populate('userId', 'name email phone profilePicture')
        .populate('driverId', 'name email phone licenseNumber profilePicture rating')
        .populate('vehicleId', 'licensePlate model make year color type');

      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      // Check if user has access to this ride
      if (req.user.role !== 'admin' && 
          ride.userId._id.toString() !== req.user.id && 
          ride.driverId?._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(ride);

    } catch (error) {
      console.error('Get ride by ID error:', error);
      res.status(500).json({ message: 'Failed to fetch ride details' });
    }
  },

  // Start ride (driver)
  startRide: async (req, res) => {
    try {
      const { id } = req.params;
      const driverId = req.user.id;

      const ride = await Booking.findById(id);
      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      if (ride.driverId.toString() !== driverId) {
        return res.status(403).json({ message: 'Not authorized to start this ride' });
      }

      if (ride.status !== 'confirmed') {
        return res.status(400).json({ message: 'Ride cannot be started in current status' });
      }

      ride.status = 'in_progress';
      ride.actualPickupTime = new Date();
      await ride.save();

      // Emit socket event for real-time updates
      req.io?.to(`ride_${id}`).emit('rideStarted', {
        rideId: id,
        startTime: ride.actualPickupTime
      });

      res.json({
        message: 'Ride started successfully',
        ride: {
          id: ride._id,
          status: ride.status,
          actualPickupTime: ride.actualPickupTime
        }
      });

    } catch (error) {
      console.error('Start ride error:', error);
      res.status(500).json({ message: 'Failed to start ride' });
    }
  },

  // Complete ride (driver)
  completeRide: async (req, res) => {
    try {
      const { id } = req.params;
      const { actualDropoffTime, actualFare, odometerReading } = req.body;
      const driverId = req.user.id;

      const ride = await Booking.findById(id);
      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      if (ride.driverId.toString() !== driverId) {
        return res.status(403).json({ message: 'Not authorized to complete this ride' });
      }

      if (ride.status !== 'in_progress') {
        return res.status(400).json({ message: 'Ride is not in progress' });
      }

      ride.status = 'completed';
      ride.actualDropoffTime = actualDropoffTime || new Date();
      if (actualFare) ride.fare = actualFare;
      
      // Calculate actual duration
      if (ride.actualPickupTime) {
        ride.actualDuration = Math.ceil((ride.actualDropoffTime - ride.actualPickupTime) / (1000 * 60)); // in minutes
      }

      await ride.save();

      // Update driver's completed rides count
      await Driver.findByIdAndUpdate(driverId, {
        $inc: { completedRides: 1 }
      });

      // Emit socket event for real-time updates
      req.io?.to(`ride_${id}`).emit('rideCompleted', {
        rideId: id,
        completedTime: ride.actualDropoffTime,
        fare: ride.fare
      });

      res.json({
        message: 'Ride completed successfully',
        ride: {
          id: ride._id,
          status: ride.status,
          actualDropoffTime: ride.actualDropoffTime,
          fare: ride.fare,
          duration: ride.actualDuration
        }
      });

    } catch (error) {
      console.error('Complete ride error:', error);
      res.status(500).json({ message: 'Failed to complete ride' });
    }
  },

  // Cancel ride
  cancelRide: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, cancelledBy } = req.body;
      const userId = req.user.id;

      const ride = await Booking.findById(id);
      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      // Check authorization
      if (req.user.role !== 'admin' && 
          ride.userId.toString() !== userId && 
          ride.driverId?.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to cancel this ride' });
      }

      if (!['pending', 'confirmed'].includes(ride.status)) {
        return res.status(400).json({ message: 'Ride cannot be cancelled in current status' });
      }

      ride.status = 'cancelled';
      ride.cancellationReason = reason;
      ride.cancelledBy = cancelledBy || req.user.role;
      ride.cancelledAt = new Date();
      await ride.save();

      // If driver was assigned, make them available again
      if (ride.driverId) {
        await Driver.findByIdAndUpdate(ride.driverId, {
          status: 'available'
        });
      }

      // Emit socket event for real-time updates
      req.io?.to(`ride_${id}`).emit('rideCancelled', {
        rideId: id,
        reason,
        cancelledBy: ride.cancelledBy
      });

      res.json({
        message: 'Ride cancelled successfully',
        ride: {
          id: ride._id,
          status: ride.status,
          cancellationReason: ride.cancellationReason
        }
      });

    } catch (error) {
      console.error('Cancel ride error:', error);
      res.status(500).json({ message: 'Failed to cancel ride' });
    }
  },

  // Get ride tracking info
  getRideTracking: async (req, res) => {
    try {
      const { id } = req.params;
      
      const ride = await Booking.findById(id)
        .populate('driverId', 'name phone currentLocation')
        .populate('vehicleId', 'licensePlate model make');

      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      // Check if user has access to this ride
      if (req.user.role !== 'admin' && 
          ride.userId.toString() !== req.user.id && 
          ride.driverId?._id.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const trackingInfo = {
        rideId: ride._id,
        status: ride.status,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        estimatedPickupTime: ride.estimatedPickupTime,
        actualPickupTime: ride.actualPickupTime,
        estimatedDropoffTime: ride.estimatedDropoffTime,
        actualDropoffTime: ride.actualDropoffTime,
        driver: ride.driverId ? {
          id: ride.driverId._id,
          name: ride.driverId.name,
          phone: ride.driverId.phone,
          currentLocation: ride.driverId.currentLocation
        } : null,
        vehicle: ride.vehicleId ? {
          licensePlate: ride.vehicleId.licensePlate,
          model: ride.vehicleId.model,
          make: ride.vehicleId.make
        } : null
      };

      res.json(trackingInfo);

    } catch (error) {
      console.error('Get ride tracking error:', error);
      res.status(500).json({ message: 'Failed to fetch ride tracking info' });
    }
  },

  // Update ride location (driver)
  updateRideLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { currentLocation } = req.body;
      const driverId = req.user.id;

      const ride = await Booking.findById(id);
      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      if (ride.driverId.toString() !== driverId) {
        return res.status(403).json({ message: 'Not authorized to update this ride' });
      }

      // Update driver's current location
      await Driver.findByIdAndUpdate(driverId, {
        currentLocation
      });

      // Emit location update to passengers
      req.io?.to(`ride_${id}`).emit('locationUpdate', {
        rideId: id,
        driverLocation: currentLocation,
        timestamp: new Date()
      });

      res.json({
        message: 'Location updated successfully',
        location: currentLocation
      });

    } catch (error) {
      console.error('Update ride location error:', error);
      res.status(500).json({ message: 'Failed to update ride location' });
    }
  },

  // Get ride statistics
  getRideStats: async (req, res) => {
    try {
      const { startDate, endDate, driverId, userId } = req.query;
      
      const matchQuery = {};
      if (startDate || endDate) {
        matchQuery.createdAt = {};
        if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
        if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
      }
      if (driverId) matchQuery.driverId = driverId;
      if (userId) matchQuery.userId = userId;

      const stats = await Booking.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRides: { $sum: 1 },
            completedRides: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelledRides: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            totalRevenue: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$fare', 0] }
            },
            averageFare: {
              $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$fare', null] }
            },
            averageDuration: {
              $avg: '$actualDuration'
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalRides: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalRevenue: 0,
        averageFare: 0,
        averageDuration: 0
      };

      result.completionRate = result.totalRides > 0 ? 
        ((result.completedRides / result.totalRides) * 100).toFixed(2) : 0;

      res.json(result);

    } catch (error) {
      console.error('Get ride stats error:', error);
      res.status(500).json({ message: 'Failed to fetch ride statistics' });
    }
  },

  // Rate ride
  rateRide: async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user.id;

      const ride = await Booking.findById(id);
      if (!ride) {
        return res.status(404).json({ message: 'Ride not found' });
      }

      if (ride.userId.toString() !== userId) {
        return res.status(403).json({ message: 'Not authorized to rate this ride' });
      }

      if (ride.status !== 'completed') {
        return res.status(400).json({ message: 'Can only rate completed rides' });
      }

      // Check if review already exists
      const existingReview = await Review.findOne({ 
        bookingId: id, 
        reviewerId: userId 
      });

      if (existingReview) {
        return res.status(400).json({ message: 'You have already rated this ride' });
      }

      // Create review
      const review = new Review({
        bookingId: id,
        reviewerId: userId,
        revieweeId: ride.driverId,
        reviewerType: 'passenger',
        revieweeType: 'driver',
        rating,
        comment
      });

      await review.save();

      // Update driver's average rating
      const driverReviews = await Review.find({ 
        revieweeId: ride.driverId,
        revieweeType: 'driver'
      });

      const averageRating = driverReviews.reduce((sum, rev) => sum + rev.rating, 0) / driverReviews.length;
      
      await Driver.findByIdAndUpdate(ride.driverId, {
        rating: averageRating,
        totalReviews: driverReviews.length
      });

      res.json({
        message: 'Ride rated successfully',
        review: {
          id: review._id,
          rating,
          comment
        }
      });

    } catch (error) {
      console.error('Rate ride error:', error);
      res.status(500).json({ message: 'Failed to rate ride' });
    }
  }
};

module.exports = rideController;