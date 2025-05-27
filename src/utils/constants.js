// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  DRIVER: 'driver',
  PASSENGER: 'passenger'
};

// Ride status constants
const RIDE_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  DRIVER_ARRIVED: 'driver_arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Booking status constants
const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Payment status constants
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Payment methods
const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  DIGITAL_WALLET: 'digital_wallet',
  UPI: 'upi'
};

// Driver status
const DRIVER_STATUS = {
  OFFLINE: 'offline',
  ONLINE: 'online',
  BUSY: 'busy',
  ON_RIDE: 'on_ride'
};

// Vehicle types
const VEHICLE_TYPES = {
  SEDAN: 'sedan',
  SUV: 'suv',
  HATCHBACK: 'hatchback',
  LUXURY: 'luxury',
  BIKE: 'bike',
  AUTO: 'auto'
};

// Socket events
const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  
  // Ride events
  RIDE_REQUEST: 'ride_request',
  RIDE_ACCEPTED: 'ride_accepted',
  RIDE_REJECTED: 'ride_rejected',
  RIDE_CANCELLED: 'ride_cancelled',
  RIDE_STARTED: 'ride_started',
  RIDE_COMPLETED: 'ride_completed',
  
  // Location events
  LOCATION_UPDATE: 'location_update',
  DRIVER_LOCATION: 'driver_location',
  
  // Notification events
  NOTIFICATION: 'notification',
  DRIVER_ARRIVED: 'driver_arrived',
  
  // Driver events
  DRIVER_ONLINE: 'driver_online',
  DRIVER_OFFLINE: 'driver_offline'
};

// Error messages
const ERROR_MESSAGES = {
  // Authentication errors
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  
  // User errors
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  INVALID_USER_ROLE: 'Invalid user role',
  
  // Driver errors
  DRIVER_NOT_FOUND: 'Driver not found',
  DRIVER_NOT_AVAILABLE: 'Driver not available',
  DRIVER_ALREADY_EXISTS: 'Driver already exists',
  
  // Booking errors
  BOOKING_NOT_FOUND: 'Booking not found',
  BOOKING_ALREADY_EXISTS: 'Booking already exists',
  INVALID_BOOKING_STATUS: 'Invalid booking status',
  
  // Ride errors
  RIDE_NOT_FOUND: 'Ride not found',
  RIDE_ALREADY_COMPLETED: 'Ride already completed',
  RIDE_ALREADY_CANCELLED: 'Ride already cancelled',
  
  // Payment errors
  PAYMENT_FAILED: 'Payment failed',
  PAYMENT_NOT_FOUND: 'Payment not found',
  INVALID_PAYMENT_METHOD: 'Invalid payment method',
  
  // General errors
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found'
};

// Success messages
const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTER_SUCCESS: 'Registration successful',
  
  // User operations
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  
  // Driver operations
  DRIVER_CREATED: 'Driver created successfully',
  DRIVER_UPDATED: 'Driver updated successfully',
  DRIVER_STATUS_UPDATED: 'Driver status updated',
  
  // Booking operations
  BOOKING_CREATED: 'Booking created successfully',
  BOOKING_UPDATED: 'Booking updated successfully',
  BOOKING_CANCELLED: 'Booking cancelled successfully',
  
  // Ride operations
  RIDE_REQUESTED: 'Ride requested successfully',
  RIDE_ACCEPTED: 'Ride accepted successfully',
  RIDE_STARTED: 'Ride started successfully',
  RIDE_COMPLETED: 'Ride completed successfully',
  RIDE_CANCELLED: 'Ride cancelled successfully',
  
  // Payment operations
  PAYMENT_SUCCESS: 'Payment successful',
  PAYMENT_PROCESSED: 'Payment processed successfully'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// Rate limiting constants
const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  MESSAGE: 'Too many requests from this IP, please try again later.'
};

// File upload constants
const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  UPLOAD_PATH: 'uploads/'
};

// Distance and pricing constants
const PRICING = {
  BASE_FARE: 50, // Base fare in currency units
  PER_KM_RATE: 12, // Rate per kilometer
  PER_MINUTE_RATE: 2, // Rate per minute
  MINIMUM_FARE: 80, // Minimum fare
  CANCELLATION_FEE: 25, // Cancellation fee
  SURGE_MULTIPLIER: 1.5 // Surge pricing multiplier
};

// Time constants
const TIME_CONSTANTS = {
  DRIVER_SEARCH_TIMEOUT: 30000, // 30 seconds
  RIDE_TIMEOUT: 300000, // 5 minutes
  TOKEN_EXPIRY: '24h',
  REFRESH_TOKEN_EXPIRY: '7d',
  OTP_EXPIRY: 300000 // 5 minutes
};

// Regex patterns
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[\d\s\-\(\)]{10,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  VEHICLE_NUMBER: /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/,
  LICENSE_NUMBER: /^[A-Z]{2}[0-9]{13}$/
};

// Environment constants
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

module.exports = {
  USER_ROLES,
  RIDE_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  DRIVER_STATUS,
  VEHICLE_TYPES,
  SOCKET_EVENTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  RATE_LIMIT,
  FILE_UPLOAD,
  PRICING,
  TIME_CONSTANTS,
  REGEX_PATTERNS,
  ENVIRONMENTS
};