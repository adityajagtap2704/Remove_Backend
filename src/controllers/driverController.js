const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

// Get driver dashboard data
const getDriverDashboard = async (req, res) => {
  try {
    const driverId = req.user.driverId;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await Booking.aggregate([
      {
        $match: {
          driverId,
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$fare' },
          totalRides: { $sum: 1 },
          completedRides: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get current active ride
    const activeRide = await Booking.findOne({
      driverId,
      status: { $in: ['accepted', 'in-progress'] }
    }).populate('userId', 'name phone');

    // Get recent rides
    const recentRides = await Booking.find({ driverId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get driver info
    const driver = await Driver.findById(driverId)
      .populate('userId', 'name email phone')
      .populate('vehicleId');

    const stats = todayStats[0] || {
      totalEarnings: 0,
      totalRides: 0,
      completedRides: 0
    };

    res.status(200).json({
      success: true,
      data: {
        stats,
        activeRide,
        recentRides,
        driver
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching driver dashboard',
      error: error.message
    });
  }
};

// Get driver earnings
const getDriverEarnings = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    const { period = 'daily', startDate, endDate } = req.query;

    let dateFilter = {};
    let groupBy = {};

    const now = new Date();
    
    switch (period) {
      case 'daily':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateFilter = { createdAt: { $gte: today, $lt: tomorrow } };
        groupBy = {
          _id: { $hour: '$createdAt' },
          earnings: { $sum: '$fare' },
          rides: { $sum: 1 }
        };
        break;

      case 'weekly':
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        dateFilter = { createdAt: { $gte: weekStart, $lt: weekEnd } };
        groupBy = {
          _id: { $dayOfWeek: '$createdAt' },
          earnings: { $sum: '$fare' },
          rides: { $sum: 1 }
        };
        break;

      case 'monthly':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        dateFilter = { createdAt: { $gte: monthStart, $lt: monthEnd } };
        groupBy = {
          _id: { $dayOfMonth: '$createdAt' },
          earnings: { $sum: '$fare' },
          rides: { $sum: 1 }
        };
        break;

      case 'custom':
        if (startDate && endDate) {
          dateFilter = {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          };
          groupBy = {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            earnings: { $sum: '$fare' },
            rides: { $sum: 1 }
          };
        }
        break;
    }

    const earnings = await Booking.aggregate([
      {
        $match: {
          driverId,
          status: 'completed',
          ...dateFilter
        }
      },
      { $group: groupBy },
      { $sort: { '_id': 1 } }
    ]);

    // Get total earnings summary
    const totalEarnings = await Booking.aggregate([
      {
        $match: {
          driverId,
          status: 'completed',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$fare' },
          totalRides: { $sum: 1 },
          avgFare: { $avg: '$fare' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        earnings,
        summary: totalEarnings[0] || {
          totalAmount: 0,
          totalRides: 0,
          avgFare: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching driver earnings',
      error: error.message
    });
  }
};

// Update driver status (online/offline)
const updateDriverStatus = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    const { status, location } = req.body;

    const updateData = { status };
    if (location) {
      updateData.currentLocation = {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      };
      updateData.lastLocationUpdate = new Date();
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      updateData,
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driver status updated successfully',
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating driver status',
      error: error.message
    });
  }
};

// Get ride requests for driver
const getRideRequests = async (req, res) => {
  try {
    const driverId = req.user.driverId;

    // Get pending ride requests near driver's location
    const driver = await Driver.findById(driverId);
    
    if (!driver || !driver.currentLocation) {
      return res.status(400).json({
        success: false,
        message: 'Driver location not available'
      });
    }

    const rideRequests = await Booking.find({
      status: 'pending',
      'pickupLocation.coordinates': {
        $near: {
          $geometry: driver.currentLocation,
          $maxDistance: 10000 // 10km radius
        }
      }
    }).populate('userId', 'name phone');

    res.status(200).json({
      success: true,
      data: rideRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching ride requests',
      error: error.message
    });
  }
};

// Accept ride request
const acceptRide = async (req, res) => {
  try {
    const driverId = req.user.driverId;
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking is no longer available'
      });
    }

    // Update booking
    booking.driverId = driverId;
    booking.status = 'accepted';
    booking.acceptedAt = new Date();
    await booking.save();

    // Update driver status
    await Driver.findByIdAndUpdate(driverId, { status: 'busy' });

    const populatedBooking = await Booking.findById(bookingId)
      .populate('userId', 'name phone')
      .populate('driverId');

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully',
      data: populatedBooking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error accepting ride',
      error: error.message
    });
  }
};

// Update ride status
const updateRideStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, location } = req.body;
    const driverId = req.user.driverId;

    const booking = await Booking.findOne({
      _id: bookingId,
      driverId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.status = status;

    if (status === 'in-progress') {
      booking.startedAt = new Date();
    } else if (status === 'completed') {
      booking.completedAt = new Date();
      // Update driver status back to available
      await Driver.findByIdAndUpdate(driverId, { status: 'available' });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Ride status updated successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating ride status',
      error: error.message
    });
  }
};

// Get driver profile
const getDriverProfile = async (req, res) => {
  try {
    const driverId = req.user.driverId;

    const driver = await Driver.findById(driverId)
      .populate('userId', 'name email phone')
      .populate('vehicleId');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    // Get driver statistics
    const stats = await Booking.aggregate([
      { $match: { driverId, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRides: { $sum: 1 },
          totalEarnings: { $sum: '$fare' },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...driver.toObject(),
        stats: stats[0] || {
          totalRides: 0,
          totalEarnings: 0,
          avgRating: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching driver profile',
      error: error.message
    });
  }
};

module.exports = {
  getDriverDashboard,
  getDriverEarnings,
  updateDriverStatus,
  getRideRequests,
  acceptRide,
  updateRideStatus,
  getDriverProfile
};