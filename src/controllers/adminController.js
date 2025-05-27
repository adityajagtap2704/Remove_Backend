const User = require('../models/User');
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

// Get admin dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'passenger' });
    const totalDrivers = await Driver.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const activeRides = await Booking.countDocuments({ status: 'in-progress' });
    const totalRevenue = await Booking.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fare' } } }
    ]);

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate('userId', 'name email')
      .populate('driverId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Monthly revenue
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$fare' },
          rides: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalDrivers,
          totalBookings,
          activeRides,
          totalRevenue: totalRevenue[0]?.total || 0
        },
        recentBookings,
        monthlyRevenue
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';

    const filter = {
      $and: [
        role ? { role } : {},
        search ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        } : {}
      ]
    };

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Update user status
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If user is a driver, also delete driver profile
    if (user.role === 'driver') {
      await Driver.findOneAndDelete({ userId });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// Get system reports
const getReports = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let reportData = {};

    switch (type) {
      case 'revenue':
        reportData = await Booking.aggregate([
          { $match: { ...dateFilter, status: 'completed' } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              revenue: { $sum: '$fare' },
              rides: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]);
        break;

      case 'rides':
        reportData = await Booking.aggregate([
          { $match: dateFilter },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);
        break;

      case 'drivers':
        reportData = await Driver.aggregate([
          {
            $lookup: {
              from: 'bookings',
              localField: '_id',
              foreignField: 'driverId',
              as: 'rides'
            }
          },
          {
            $project: {
              name: 1,
              email: 1,
              totalRides: { $size: '$rides' },
              totalEarnings: {
                $sum: {
                  $map: {
                    input: '$rides',
                    as: 'ride',
                    in: '$$ride.fare'
                  }
                }
              }
            }
          }
        ]);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    res.status(200).json({
      success: true,
      data: reportData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getReports
};