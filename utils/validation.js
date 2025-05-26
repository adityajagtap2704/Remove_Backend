const Joi = require('joi');

// User registration validation
const validateRegistration = (data) => {
  const schema = Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]{10,}$/)
      .required()
      .messages({
        'string.pattern.base': 'Please enter a valid phone number',
        'any.required': 'Phone number is required'
      }),
    
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      }),
    
    userType: Joi.string()
      .valid('rider', 'driver')
      .required()
      .messages({
        'any.only': 'User type must be either rider or driver',
        'any.required': 'User type is required'
      })
  });

  return schema.validate(data);
};

// User login validation
const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please enter a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  });

  return schema.validate(data);
};

// Driver registration validation
const validateDriverRegistration = (data) => {
  const schema = Joi.object({
    licenseNumber: Joi.string()
      .trim()
      .required()
      .messages({
        'any.required': 'License number is required'
      }),
    
    licenseExpiry: Joi.date()
      .greater('now')
      .required()
      .messages({
        'date.greater': 'License must not be expired',
        'any.required': 'License expiry date is required'
      }),
    
    vehicle: Joi.object({
      make: Joi.string().trim().required(),
      model: Joi.string().trim().required(),
      year: Joi.number().integer().min(1980).max(new Date().getFullYear() + 1).required(),
      color: Joi.string().trim().required(),
      plateNumber: Joi.string().trim().required(),
      type: Joi.string().valid('sedan', 'suv', 'hatchback', 'luxury', 'economy').required(),
      capacity: Joi.number().integer().min(1).max(8).required()
    }).required(),
    
    bankDetails: Joi.object({
      accountNumber: Joi.string().required(),
      ifscCode: Joi.string().required(),
      accountHolderName: Joi.string().required(),
      bankName: Joi.string().required()
    }).optional()
  });

  return schema.validate(data);
};

// Ride request validation
const validateRideRequest = (data) => {
  const schema = Joi.object({
    pickup: Joi.object({
      location: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).required()
      }).required(),
      address: Joi.string().required(),
      landmark: Joi.string().optional(),
      instructions: Joi.string().optional()
    }).required(),
    
    destination: Joi.object({
      location: Joi.object({
        type: Joi.string().valid('Point').default('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2).required()
      }).required(),
      address: Joi.string().required(),
      landmark: Joi.string().optional(),
      instructions: Joi.string().optional()
    }).required(),
    
    vehicleType: Joi.string()
      .valid('sedan', 'suv', 'hatchback', 'luxury', 'economy')
      .required(),
    
    passengers: Joi.number().integer().min(1).max(8).default(1),
    
    scheduledTime: Joi.date().greater('now').optional(),
    
    paymentMethod: Joi.string()
      .valid('cash', 'card', 'wallet', 'upi')
      .default('cash'),
    
    specialRequests: Joi.object({
      wheelchairAccessible: Joi.boolean().default(false),
      childSeat: Joi.boolean().default(false),
      petFriendly: Joi.boolean().default(false),
      notes: Joi.string().optional()
    }).optional()
  });

  return schema.validate(data);
};

// Location update validation
const validateLocationUpdate = (data) => {
  const schema = Joi.object({
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2).required()
    }).required(),
    
    address: Joi.object({
      formatted: Joi.string().optional(),
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      zipCode: Joi.string().optional(),
      landmark: Joi.string().optional()
    }).optional(),
    
    accuracy: Joi.number().min(0).optional(),
    speed: Joi.number().min(0).optional(),
    heading: Joi.number().min(0).max(360).optional(),
    altitude: Joi.number().optional(),
    source: Joi.string().valid('gps', 'network', 'manual').default('gps'),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    networkType: Joi.string().valid('wifi', '4g', '3g', '2g', 'unknown').optional()
  });

  return schema.validate(data);
};

// Rating validation
const validateRating = (data) => {
  const schema = Joi.object({
    score: Joi.number().min(1).max(5).required(),
    comment: Joi.string().max(500).optional()
  });

  return schema.validate(data);
};

// Profile update validation
const validateProfileUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,}$/).optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional(),
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        sms: Joi.boolean().optional(),
        push: Joi.boolean().optional()
      }).optional(),
      language: Joi.string().optional(),
      currency: Joi.string().optional()
    }).optional()
  });

  return schema.validate(data);
};

// Search validation
const validateSearch = (data) => {
  const schema = Joi.object({
    query: Joi.string().trim().min(1).max(100).required(),
    type: Joi.string().valid('user', 'driver', 'ride').optional(),
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1)
  });

  return schema.validate(data);
};

// Coordinates validation helper
const validateCoordinates = (longitude, latitude) => {
  return longitude >= -180 && longitude <= 180 && 
         latitude >= -90 && latitude <= 90;
};

// MongoDB ObjectId validation
const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateDriverRegistration,
  validateRideRequest,
  validateLocationUpdate,
  validateRating,
  validateProfileUpdate,
  validateSearch,
  validateCoordinates,
  validateObjectId
};