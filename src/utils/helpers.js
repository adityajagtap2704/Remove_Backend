const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PRICING, TIME_CONSTANTS } = require('./constants');

// Logging utilities
const logInfo = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[INFO] ${timestamp}: ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logError = (message, error = null) => {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] ${timestamp}: ${message}`, error || '');
};

const logWarning = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.warn(`[WARNING] ${timestamp}: ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// Password utilities
const hashPassword = async (password) => {
  try {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    logError('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logError('Error comparing password:', error);
    throw new Error('Password comparison failed');
  }
};

// JWT utilities
const generateToken = (payload, expiresIn = TIME_CONSTANTS.TOKEN_EXPIRY) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  } catch (error) {
    logError('Error generating token:', error);
    throw new Error('Token generation failed');
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logError('Error verifying token:', error);
    throw new Error('Token verification failed');
  }
};

// Random generation utilities
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

const generateUniqueId = () => {
  return crypto.randomBytes(16).toString('hex');
};

const generateBookingId = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CG${timestamp.slice(-6)}${random}`;
};

// Distance calculation utilities
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Fare calculation utilities
const calculateFare = (distance, duration, vehicleType = 'sedan', surgeMultiplier = 1) => {
  let baseFare = PRICING.BASE_FARE;
  let perKmRate = PRICING.PER_KM_RATE;
  let perMinuteRate = PRICING.PER_MINUTE_RATE;
  
  // Adjust rates based on vehicle type
  switch (vehicleType.toLowerCase()) {
    case 'luxury':
      baseFare *= 2;
      perKmRate *= 1.8;
      perMinuteRate *= 1.5;
      break;
    case 'suv':
      baseFare *= 1.5;
      perKmRate *= 1.3;
      perMinuteRate *= 1.2;
      break;
    case 'bike':
      baseFare *= 0.6;
      perKmRate *= 0.7;
      perMinuteRate *= 0.8;
      break;
    case 'auto':
      baseFare *= 0.8;
      perKmRate *= 0.8;
      perMinuteRate *= 0.9;
      break;
    default: // sedan, hatchback
      break;
  }
  
  const distanceFare = distance * perKmRate;
  const timeFare = (duration / 60) * perMinuteRate; // duration in seconds, convert to minutes
  let totalFare = (baseFare + distanceFare + timeFare) * surgeMultiplier;
  
  // Apply minimum fare
  totalFare = Math.max(totalFare, PRICING.MINIMUM_FARE);
  
  return Math.round(totalFare * 100) / 100; // Round to 2 decimal places
};

// Time utilities
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

const isExpired = (timestamp, expiryDuration = TIME_CONSTANTS.OTP_EXPIRY) => {
  return Date.now() - timestamp > expiryDuration;
};

// Array utilities
const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Object utilities
const removeEmptyFields = (obj) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

const pick = (obj, keys) => {
  const picked = {};
  keys.forEach(key => {
    if (key in obj) {
      picked[key] = obj[key];
    }
  });
  return picked;
};

const omit = (obj, keys) => {
  const omitted = { ...obj };
  keys.forEach(key => {
    delete omitted[key];
  });
  return omitted;
};

// String utilities
const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
};

// Phone number utilities
const formatPhoneNumber = (phone) => {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as +91XXXXXXXXXX for Indian numbers
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('+91')) {
    return cleaned;
  }
  
  return phone; // Return original if format not recognized
};

// Location utilities
const isValidCoordinate = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

const formatAddress = (address) => {
  const { street, city, state, country, pincode } = address;
  const parts = [street, city, state, country, pincode].filter(Boolean);
  return parts.join(', ');
};

// Error handling utilities
const createError = (message, statusCode = 500, code = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Response utilities
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

// Pagination utilities
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

const createPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null
    }
  };
};

// Date utilities
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getEndOfDay = (date = new Date()) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

module.exports = {
  // Logging
  logInfo,
  logError,
  logWarning,
  
  // Password
  hashPassword,
  comparePassword,
  
  // JWT
  generateToken,
  verifyToken,
  
  // Random generation
  generateOTP,
  generateUniqueId,
  generateBookingId,
  
  // Distance and location
  calculateDistance,
  calculateFare,
  isValidCoordinate,
  formatAddress,
  
  // Time
  formatDuration,
  isExpired,
  formatDate,
  getStartOfDay,
  getEndOfDay,
  
  // Array utilities
  getRandomElement,
  shuffleArray,
  
  // Object utilities
  removeEmptyFields,
  pick,
  omit,
  
  // String utilities
  capitalizeFirst,
  generateSlug,
  formatPhoneNumber,
  
  // Error handling
  createError,
  asyncHandler,
  
  // Response utilities
  sendSuccess,
  sendError,
  
  // Pagination
  getPaginationParams,
  createPaginationResponse
};