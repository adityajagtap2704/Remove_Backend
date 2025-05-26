const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.'
      });
    }
  }
};

// Middleware to check if user is a rider
const requireRider = (req, res, next) => {
  if (req.user.userType !== 'rider') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Rider access required.'
    });
  }
  next();
};

// Middleware to check if user is a driver
const requireDriver = (req, res, next) => {
  if (req.user.userType !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Driver access required.'
    });
  }
  next();
};

// Middleware to check if user is either rider or driver (flexible)
const requireUser = (req, res, next) => {
  if (!['rider', 'driver'].includes(req.user.userType)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Valid user type required.'
    });
  }
  next();
};

// Middleware to check if user owns the resource
const requireOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (resourceUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }
    next();
  };
};

// Middleware for admin access (if you have admin users)
const requireAdmin = (req, res, next) => {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin access required.'
    });
  }
  next();
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Middleware to check if driver is approved
const requireApprovedDriver = async (req, res, next) => {
  try {
    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Driver access required.'
      });
    }

    const Driver = require('../models/Driver');
    const driver = await Driver.findOne({ userId: req.user._id });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found.'
      });
    }

    if (driver.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Driver account is ${driver.status}. Contact support for assistance.`
      });
    }

    req.driver = driver;
    next();
  } catch (error) {
    console.error('Driver approval check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// Rate limiting for authentication endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authenticateToken,
  requireRider,
  requireDriver,
  requireUser,
  requireOwnership,
  requireAdmin,
  optionalAuth,
  requireApprovedDriver,
  authRateLimit
};