const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { generateOTP } = require('../utils/helpers');

const bookingController = {
  // Create a new booking
  createBooking: async (req, res) => {
    try {
      const {
        pickupLocation,
        dropoffLocation,
        cabType,
        fare,
        distance,
        paymentMethod,
        isScheduled,
        scheduledDate,
        scheduledTime,
        notes
      } = req.body;

      const booking = new Booking({
        userId: req.user.id,
        pickupLocation,
        dropoffLocation,
        cabType,
        fare,
        distance,
        paymentMethod,
        isScheduled,
        scheduledDate: isScheduled ? scheduledDate : null,
        scheduledTime: isScheduled ? scheduledTime : null,
        notes,
        otp: generateOTP()
      });

      await booking.save();

      // Find nearby drivers
      if (!isScheduled) {
        await findAndAssignDriver(booking);
      }

      const populatedBooking = await Booking.findById(booking._id)
        .populate('userId', 'name phone')
        .populate('driverId');

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        booking: populatedBooking
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message
      });
    }
  },

  // Get user's bookings
  getUserBookings: async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const filter = { userId: req.user.id };
      
      if (status && status !== 'all') {
        filter.status = status;
      }

      const bookings = await Booking.find(filter)
        .populate('driverId')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Booking.countDocuments(filter);

      res.json({
        success: true,
        bookings,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bookings',
        error: error.message
      });
    }
  },

  // Get booking by ID
  getBookingById: async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id)
        .populate('userId', 'name phone avatar')
        .populate('driverId');

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check if user owns this booking or is the assigned driver
      if (booking.userId._id.toString() !== req.user.id && 
          (!booking.driverId || booking.driverId.userId.toString() !== req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        booking
      });
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch booking',
        error: error.message
      });
    }
  },

  // Update booking status
  updateBookingStatus: async (req, res) => {
    try {
      const { status, actualPickupTime, actualDropoffTime } = req.body;
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      booking.status = status;
      
      if (actualPickupTime) booking.actualPickupTime = actualPickupTime;
      if (actualDropoffTime) booking.actualDropoffTime = actualDropoffTime;
      
      if (status === 'confirmed') {
        booking.estimatedArrival = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      }

      await booking.save();

      const updatedBooking = await Booking.findById(booking._id)
        .populate('userId', 'name phone')
        .populate('driverId');

      // Emit socket event for real-time updates
      req.io.to(`booking_${booking._id}`).emit('bookingStatusUpdate', {
        bookingId: booking._id,
        status,
        booking: updatedBooking
      });

      res.json({
        success: true,
        message: 'Booking status updated',
        booking: updatedBooking
      });
    } catch (error) {
      console.error('Update booking status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update booking status',
        error: error.message
      });
    }
  },

  // Cancel booking
  cancelBooking: async (req, res) => {
    try {
      const { reason, isLate } = req.body;
      const booking = await Booking.findById(req.params.id);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Booking cannot be cancelled'
        });
      }

      // Calculate cancellation fee
      let cancellationFee = 0;
      if (booking.status === 'confirmed' || isLate) {
        cancellationFee = Math.min(booking.fare * 0.1, 5); // 10% or $5, whichever is lower
      }

      booking.status = 'cancelled';
      booking.cancellationReason = reason;
      booking.cancellationFee = cancellationFee;

      await booking.save();

      // Make driver available again
      if (booking.driverId) {
        await Driver.findByIdAndUpdate(booking.driverId, { status: 'online' });
      }

      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        cancellationFee
      });
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    }
  }
};

// Helper function to find and assign driver
async function findAndAssignDriver(booking) {
  try {
    const drivers = await Driver.find({
      status: 'online',
      availability: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [booking.pickupLocation.coordinates.lng, booking.pickupLocation.coordinates.lat]
          },
          $maxDistance: 5000 // 5km radius
        }
      }
    }).populate('userId vehicleId').limit(5);

    if (drivers.length > 0) {
      // Assign the first available driver
      const selectedDriver = drivers[0];
      booking.driverId = selectedDriver._id;
      booking.status = 'confirmed';
      
      // Update driver status
      selectedDriver.status = 'busy';
      await selectedDriver.save();
      await booking.save();
    }
  } catch (error) {
    console.error('Find driver error:', error);
  }
}

module.exports = bookingController;
