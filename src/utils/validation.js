const { REGEX_PATTERNS, USER_ROLES, VEHICLE_TYPES, PAYMENT_METHODS } = require('./constants');
const { createError } = require('./helpers');

// Environment validation
const validateEnvVariables = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'MONGODB_URI',
    'NODE_ENV'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Basic validation functions
const isEmail = (email) => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

const isPhone = (phone) => {
  return REGEX_PATTERNS.PHONE.test(phone);
};

const isStrongPassword = (password) => {
  return REGEX_PATTERNS.PASSWORD.test(password);
};

const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

const isValidVehicleType = (type) => {
  return Object.values(VEHICLE_TYPES).includes(type);
};

const isValidPaymentMethod = (method) => {
  return Object.values(PAYMENT_METHODS).includes(method);
};

const isValidCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

const isValidVehicleNumber = (vehicleNumber) => {
  return REGEX_PATTERNS.VEHICLE_NUMBER.test(vehicleNumber);
};

const isValidLicenseNumber = (licenseNumber) => {
  return REGEX_PATTERNS.LICENSE_NUMBER.test(licenseNumber);
};

// Validation middleware generators
const validateRequired = (fields) => {
  return (req, res, next) => {
    const errors = [];
    const data = { ...req.body, ...req.params, ...req.query };
    
    fields.forEach(field => {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`${field} is required`);
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

// User validation schemas
const validateUserRegistration = (userData) => {
  const errors = [];
  const { name, email, password, phone, role } = userData;
  
  // Name validation
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  // Email validation
  if (!email || !isEmail(email)) {
    errors.push('Valid email is required');
  }
  
  // Password validation
  if (!password || !isStrongPassword(password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, number and special character');
  }
  
  // Phone validation
  if (!phone || !isPhone(phone)) {
    errors.push('Valid phone number is required');
  }
  
  // Role validation
  if (role && !isValidRole(role)) {
    errors.push('Invalid user role');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUserLogin = (userData) => {
  const errors = [];
  const { email, password } = userData;
  
  if (!email || !isEmail(email)) {
    errors.push('Valid email is required');
  }
  
  if (!password || password.length < 1) {
    errors.push('Password is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUserUpdate = (userData) => {
  const errors = [];
  const { name, email, phone } = userData;
  
  if (name && name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (email && !isEmail(email)) {
    errors.push('Valid email is required');
  }
  
  if (phone && !isPhone(phone)) {
    errors.push('Valid phone number is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Driver validation schemas
const validateDriverRegistration = (driverData) => {
  const errors = [];
  const { 
    name, email, password, phone, 
    licenseNumber, vehicleNumber, vehicleType, vehicleModel 
  } = driverData;
  
  // Basic user validation
  const userValidation = validateUserRegistration({ name, email, password, phone });
  errors.push(...userValidation.errors);
  
  // License validation
  if (!licenseNumber || !isValidLicenseNumber(licenseNumber)) {
    errors.push('Valid license number is required');
  }
  
  // Vehicle number validation
  if (!vehicleNumber || !isValidVehicleNumber(vehicleNumber)) {
    errors.push('Valid vehicle number is required');
  }
  
  // Vehicle type validation
  if (!vehicleType || !isValidVehicleType(vehicleType)) {
    errors.push('Valid vehicle type is required');
  }
  
  // Vehicle model validation
  if (!vehicleModel || vehicleModel.trim().length < 2) {
    errors.push('Vehicle model is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDriverUpdate = (driverData) => {
  const errors = [];
  const { name, email, phone, vehicleNumber, vehicleType, vehicleModel } = driverData;
  
  // Basic user validation
  const userValidation = validateUserUpdate({ name, email, phone });
  errors.push(...userValidation.errors);
  
  if (vehicleNumber && !isValidVehicleNumber(vehicleNumber)) {
    errors.push('Valid vehicle number is required');
  }
  
  if (vehicleType && !isValidVehicleType(vehicleType)) {
    errors.push('Valid vehicle type is required');
  }
  
  if (vehicleModel && vehicleModel.trim().length < 2) {
    errors.push('Vehicle model must be at least 2 characters long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Booking validation schemas
const validateBookingRequest = (bookingData) => {
  const errors = [];
  const { 
    pickupLocation, dropoffLocation, 
    vehicleType, scheduledTime 
  } = bookingData;
  
  // Pickup location validation
  if (!pickupLocation) {
    errors.push('Pickup location is required');
  } else {
    if (!pickupLocation.coordinates || pickupLocation.coordinates.length !== 2) {
      errors.push('Valid pickup coordinates are required');
    } else {
      const [lng, lat] = pickupLocation.coordinates;
      if (!isValidCoordinates(lat, lng)) {
        errors.push('Valid pickup coordinates are required');
      }
    }
    
    if (!pickupLocation.address || pickupLocation.address.trim().length < 5) {
      errors.push('Pickup address is required');
    }
  }
  
  // Dropoff location validation
  if (!dropoffLocation) {
    errors.push('Dropoff location is required');
  } else {
    if (!dropoffLocation.coordinates || dropoffLocation.coordinates.length !== 2) {
      errors.push('Valid dropoff coordinates are required');
    } else {
      const [lng, lat] = dropoffLocation.coordinates;
      if (!isValidCoordinates(lat, lng)) {
        errors.push('Valid dropoff coordinates are required');
      }
    }
    
    if (!dropoffLocation.address || dropoffLocation.address.trim().length < 5) {
      errors.push('Dropoff address is required');
    }
  }
  
  // Vehicle type validation
  if (vehicleType && !isValidVehicleType(vehicleType)) {
    errors.push('Valid vehicle type is required');
  }
  
  // Scheduled time validation
  if (scheduledTime) {
    const scheduledDate = new Date(scheduledTime);
    const now = new Date();
    
    if (isNaN(scheduledDate.getTime())) {
      errors.push('Valid scheduled time is required');
    } else if (scheduledDate <= now) {
      errors.push('Scheduled time must be in the future');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Payment validation schemas
const validatePaymentRequest = (paymentData) => {
  const errors = [];
  const { amount, paymentMethod, rideId } = paymentData;
  
  // Amount validation
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    errors.push('Valid amount is required');
  }
  
  // Payment method validation
  if (!paymentMethod || !isValidPaymentMethod(paymentMethod)) {
    errors.push('Valid payment method is required');
  }
  
  // Ride ID validation
  if (!rideId || typeof rideId !== 'string') {
    errors.push('Valid ride ID is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Location validation
const validateLocationUpdate = (locationData) => {
  const errors = [];
  const { latitude, longitude, accuracy } = locationData;
  
  if (!isValidCoordinates(latitude, longitude)) {
    errors.push('Valid coordinates are required');
  }
  
  if (accuracy !== undefined && (typeof accuracy !== 'number' || accuracy < 0)) {
    errors.push('Valid accuracy is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rating validation
const validateRating = (ratingData) => {
  const errors = [];
  const { rating, comment } = ratingData;
  
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }
  
  if (comment && typeof comment !== 'string') {
    errors.push('Comment must be a string');
  }
  
  if (comment && comment.length > 500) {
    errors.push('Comment must be less than 500 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generic validation middleware
const validate = (validationFn) => {
  return (req, res, next) => {
    const validation = validationFn(req.body);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }
    
    next();
  };
};

// Sanitization functions
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

module.exports = {
  // Environment validation
  validateEnvVariables,
  
  // Basic validation functions
  isEmail,
  isPhone,
  isStrongPassword,
  isValidRole,
  isValidVehicleType,
  isValidPaymentMethod,
  isValidCoordinates,
  isValidVehicleNumber,
  isValidLicenseNumber,
  
  // Validation schemas
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateDriverRegistration,
  validateDriverUpdate,
  validateBookingRequest,
  validatePaymentRequest,
  validateLocationUpdate,
  validateRating,
  
  // Middleware
  validateRequired,
  validate,
  sanitizeInput,
  
  // Sanitization
  sanitizeString,
  sanitizeObject
};