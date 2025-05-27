const User = require('../models/User');
const Booking = require('../models/Booking');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload');

const userController = {
  // Get user profile
  getProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user statistics
      const stats = await Booking.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: null,
            totalRides: { $sum: 1 },
            completedRides: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            totalSpent: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$fare', 0] }
            }
          }
        }
      ]);

      const userStats = stats[0] || {
        totalRides: 0,
        completedRides: 0,
        totalSpent: 0
      };

      res.json({
        user: {
          ...user.toObject(),
          stats: userStats
        }
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, email, phone, dateOfBirth, address } = req.body;

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await User.findOne({ 
          email, 
          _id: { $ne: userId } 
        });
        if (existingUser) {
          return res.status(400).json({ message: 'Email already registered' });
        }
      }

      // Check if phone is already taken by another user
      if (phone) {
        const existingUser = await User.findOne({ 
          phone, 
          _id: { $ne: userId } 
        });
        if (existingUser) {
          return res.status(400).json({ message: 'Phone number already registered' });
        }
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
      if (address) updateData.address = address;

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        message: 'Profile updated successfully',
        user
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Failed to update profile' });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await User.findByIdAndUpdate(userId, {
        password: hashedPassword
      });

      res.json({ message: 'Password changed successfully' });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Failed to change password' });
    }
  },

  // Upload profile picture
  uploadProfilePicture: async (req, res) => {
    try {
      upload.single('profilePicture')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
        }

        const userId = req.user.id;
        const profilePictureUrl = `/uploads/${req.file.filename}`;

        await User.findByIdAndUpdate(userId, {
          profilePicture: profilePictureUrl
        });

        res.json({
          message: 'Profile picture uploaded successfully',
          profilePicture: profilePictureUrl
        });
      });

    } catch (error) {
      console.error('Upload profile picture error:', error);
      res.status(500).json({ message: 'Failed to upload profile picture' });
    }
  },

  // Get user bookings
  getUserBookings: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const query = { userId };
      if (status) query.status = status;

      const bookings = await Booking.find(query)
        .populate('driverId', 'name phone rating profilePicture')
        .populate('vehicleId', 'licensePlate model make color')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Booking.countDocuments(query);

      res.json({
        bookings,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      });

    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({ message: 'Failed to fetch user bookings' });
    }
  },

  // Get active booking
  getActiveBooking: async (req, res) => {
    try {
      const userId = req.user.id;

      const activeBooking = await Booking.findOne({
        userId,
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      })
      .populate('driverId', 'name phone rating profilePicture currentLocation')
      .populate('vehicleId', 'licensePlate model make color type');

      if (!activeBooking) {
        return res.status(404).json({ message: 'No active booking found' });
      }

      res.json(activeBooking);

    } catch (error) {
      console.error('Get active booking error:', error);
      res.status(500).json({ message: 'Failed to fetch active booking' });
    }
  },

  // Add favorite location
  addFavoriteLocation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, address, coordinates, type } = req.body;

      if (!name || !address || !coordinates) {
        return res.status(400).json({ message: 'Name, address, and coordinates are required' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const favoriteLocation = {
        name,
        address,
        coordinates,
        type: type || 'other'
      };

      user.favoriteLocations.push(favoriteLocation);
      await user.save();

      res.json({
        message: 'Favorite location added successfully',
        favoriteLocation
      });

    } catch (error) {
      console.error('Add favorite location error:', error);
      res.status(500).json({ message: 'Failed to add favorite location' });
    }
  },

  // Remove favorite location
  removeFavoriteLocation: async (req, res) => {
    try {
      const userId = req.user.id;
      const { locationId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.favoriteLocations = user.favoriteLocations.filter(
        location => location._id.toString() !== locationId
      );

      await user.save();

      res.json({ message: 'Favorite location removed successfully' });

    } catch (error) {
      console.error('Remove favorite location error:', error);
      res.status(500).json({ message: 'Failed to remove favorite location' });
    }
  },

  // Get favorite locations
  getFavoriteLocations: async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select('favoriteLocations');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user.favoriteLocations);

    } catch (error) {
      console.error('Get favorite locations error:', error);
      res.status(500).json({ message: 'Failed to fetch favorite locations' });
    }
  },

  // Update user preferences
  updatePreferences: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notifications, language, currency, theme } = req.body;

      const updateData = {};
      if (notifications !== undefined) updateData['preferences.notifications'] = notifications;
      if (language) updateData['preferences.language'] = language;
      if (currency) updateData['preferences.currency'] = currency;
      if (theme) updateData['preferences.theme'] = theme;

      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      res.json({
        message: 'Preferences updated successfully',
        preferences: user.preferences
      });

    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ message: 'Failed to update preferences' });
    }
  },

  // Delete user account
  deleteAccount: async (req, res) => {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required to delete account' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Password is incorrect' });
      }

      // Check for active bookings
      const activeBookings = await Booking.countDocuments({
        userId,
        status: { $in: ['pending', 'confirmed', 'in_progress'] }
      });

      if (activeBookings > 0) {
        return res.status(400).json({ 
          message: 'Cannot delete account with active bookings. Please complete or cancel all active rides first.' 
        });
      }

      // Soft delete - mark as deleted instead of removing completely
      await User.findByIdAndUpdate(userId, {
        isDeleted: true,
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.com`, // Prevent email conflicts
        phone: null
      });

      res.json({ message: 'Account deleted successfully' });

    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ message: 'Failed to delete account' });
    }
  },

  // Get user notifications
  getNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      let notifications = user.notifications || [];
      
      if (unreadOnly === 'true') {
        notifications = notifications.filter(notification => !notification.read);
      }

      // Sort by date (newest first)
      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedNotifications = notifications.slice(startIndex, endIndex);

      res.json({
        notifications: paginatedNotifications,
        totalPages: Math.ceil(notifications.length / limit),
        currentPage: page,
        total: notifications.length,
        unreadCount: notifications.filter(n => !n.read).length
      });

    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  },

  // Mark notification as read
  markNotificationRead: async (req, res) => {
    try {
      const userId = req.user.id;
      const { notificationId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const notification = user.notifications.id(notificationId);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      notification.read = true;
      notification.readAt = new Date();
      await user.save();

      res.json({ message: 'Notification marked as read' });

    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  },

  // Mark all notifications as read
  markAllNotificationsRead: async (req, res) => {
    try {
      const userId = req.user.id;

      await User.findByIdAndUpdate(userId, {
        $set: {
          'notifications.$[].read': true,
          'notifications.$[].readAt': new Date()
        }
      });

      res.json({ message: 'All notifications marked as read' });

    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  }
};

module.exports = userController;