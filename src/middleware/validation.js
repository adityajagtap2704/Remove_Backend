const Joi = require('joi');

// Custom validation schemas
const schemas = {
  // Auth validation schemas
  register: Joi.object({
    name: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string().email().lowercase().required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string().min(6).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
      }),
    phone: Joi.string().pattern(/^[+]?[1-9][\d]{7,14}$/).required()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number',
        'any.required': 'Phone number is required'
      }),
    role: Joi.string().valid('passenger', 'driver').default('passenger')
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string().required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  // User profile validation
  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[+]?[1-9][\d]{7,14}$/).optional(),
    address: Joi.string().trim().max(200).optional(),
    emergencyContact: Joi.object({
      name: Joi.string().trim().min(2).max(50).optional(),
      phone: Joi.string().pattern(/^[+]?[1-9][\d]{7,14}$/).optional()
    }).optional()
  }),

  // Booking validation schemas
  createBooking: Joi.object({
    pickupLocation: Joi.object({
      address: Joi.string().required().messages({
        'any.required': 'Pickup address is required'
      }),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }).required()
    }).required(),
    dropoffLocation: Joi.object({
      address: Joi.string().required().messages({
        'any.required': 'Dropoff address is required'
      }),
      coordinates: Joi.object({
        lat: Joi.number().min(-90).max(90).required(),
        lng: Joi.number().min(-180).max(180).required()
      }).required()
    }).required(),
    vehicleType: Joi.string().valid('economy', 'comfort', 'premium', 'suv').required()
      .messages({
        'any.only': 'Vehicle type must be one of: economy, comfort, premium, suv',
        'any.required': 'Vehicle type is required'
      }),
    scheduledTime: Joi.date().min('now').optional(),
    paymentMethod: Joi.string().valid('cash', 'card', 'wallet').required()
      .messages({
        'any.only': 'Payment method must be one of: cash, card, wallet',
        'any.required': 'Payment method is required'
      }),
    notes: Joi.string().max(500).optional()
  }),

  updateBookingStatus: Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'driver_assigned', 'in_progress', 'completed', 'cancelled').required()
      .messages({
        'any.only': 'Invalid booking status',
        'any.required': 'Status is required'
      })
  }),

  // Driver validation schemas
  driverRegistration: Joi.object({
    name: Joi.string().trim().min(2).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    phone: Joi.string().pattern(/^[+]?[1-9][\d]{7,14}$/).required(),
    licenseNumber: Joi.string().trim().min(5).max(20).required()
      .messages({
        'string.min': 'License number must be at least 5 characters',
        'any.required': 'License number is required'
      }),
    vehicleInfo: Joi.object({
      make: Joi.string().trim().min(2).max(30).required(),
      model: Joi.string().trim().min(2).max(30).required(),
      year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1).required(),
      plateNumber: Joi.string().trim().min(3).max(15).required(),
      color: Joi.string().trim().min(3).max(20).required(),
      type: Joi.string().valid('economy', 'comfort', 'premium', 'suv').required()
    }).required(),
    address: Joi.string().trim().max(200).required()
  }),

  updateDriverProfile: Joi.object({
    name: Joi.string().trim().min(2).max(50).optional(),
    phone: Joi.string().pattern(/^[+]?[1-9][\d]{7,14}$/).optional(),
    address: Joi.string().trim().max(200).optional(),
    emergencyContact: Joi.object({
      name: Joi.string().trim().min(2).max(50).optional(),
      phone: Joi.string().pattern(/^[+]?[1-9][\d]{7,14}$/).optional()
    }).optional(),
    bankDetails: Joi.object({
      accountNumber: Joi.string().trim().min(8).max(20).optional(),
      routingNumber: Joi.string().trim().min(8).max(12).optional(),
      bankName: Joi.string().trim().max(50).optional()
    }).optional()
  }),

  // Vehicle/Cab validation schemas
  addVehicle: Joi.object({
    make: Joi.string().trim().min(2).max(30).required(),
    model: Joi.string().trim().min(2).max(30).required(),
    year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1).required(),
    plateNumber: Joi.string().trim().min(3).max(15).required(),
    color: Joi.string().trim().min(3).max(20).required(),
    type: Joi.string().valid('economy', 'comfort', 'premium', 'suv').required(),
    capacity: Joi.number().integer().min(1).max(8).required(),
    driverId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional()
  }),

  updateVehicle: Joi.object({
    make: Joi.string().trim().min(2).max(30).optional(),
    model: Joi.string().trim().min(2).max(30).optional(),
    year: Joi.number().integer().min(2000).max(new Date().getFullYear() + 1).optional(),
    plateNumber: Joi.string().trim().min(3).max(15).optional(),
    color: Joi.string().trim().min(3).max(20).optional(),
    type: Joi.string().valid('economy', 'comfort', 'premium', 'suv').optional(),
    capacity: Joi.number().integer().min(1).max(8).optional(),
    status: Joi.string().valid('active', 'inactive', 'maintenance').optional(),
    driverId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).allow(null).optional()
  }),

  // Review validation schema
  createReview: Joi.object({
    bookingId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
      .messages({
        'string.pattern.base': 'Invalid booking ID',
        'any.required': 'Booking ID is required'
      }),
    rating: Joi.number().integer().min(1).max(5).required()
      .messages({
        'number.min': 'Rating must be between 1 and 5',
        'number.max': 'Rating must be between 1 and 5',
        'any.required': 'Rating is required'
      }),
    comment: Joi.string().trim().max(500).optional(),
    reviewType: Joi.string().valid('driver', 'passenger').required()
  }),

  // Payment validation schema
  processPayment: Joi.object({
    bookingId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    amount: Joi.number().positive().precision(2).required()
      .messages({
        'number.positive': 'Amount must be positive',
        'any.required': 'Amount is required'
      }),
    paymentMethod: Joi.string().valid('cash', 'card', 'wallet').required(),
    paymentDetails: Joi.object({
      cardToken: Joi.string().when('...paymentMethod', {
        is: 'card',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      walletId: Joi.string().when('...paymentMethod', {
        is: 'wallet',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    }).optional()
  }),

  // Location validation schema
  updateLocation: Joi.object({
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required()
    }).required(),
    heading: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional()
  }),

  // MongoDB ObjectId validation
  mongoId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid ID format'
    }),

  // Query parameters validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref('startDate')).optional()
  })
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[property];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorDetails
      });
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Specific validation middlewares
const validationMiddleware = {
  // Auth validations
  validateRegister: validate(schemas.register),
  validateLogin: validate(schemas.login),
  
  // Profile validations
  validateUpdateProfile: validate(schemas.updateProfile),
  
  // Booking validations
  validateCreateBooking: validate(schemas.createBooking),
  validateUpdateBookingStatus: validate(schemas.updateBookingStatus),
  
  // Driver validations
  validateDriverRegistration: validate(schemas.driverRegistration),
  validateUpdateDriverProfile: validate(schemas.updateDriverProfile),
  
  // Vehicle validations
  validateAddVehicle: validate(schemas.addVehicle),
  validateUpdateVehicle: validate(schemas.updateVehicle),
  
  // Review validation
  validateCreateReview: validate(schemas.createReview),
  
  // Payment validation
  validateProcessPayment: validate(schemas.processPayment),
  
  // Location validation
  validateUpdateLocation: validate(schemas.updateLocation),
  
  // ID validation
  validateMongoId: (paramName = 'id') => validate(schemas.mongoId, 'params'),
  
  // Query validation
  validatePagination: validate(schemas.pagination, 'query'),
  validateDateRange: validate(schemas.dateRange, 'query'),
  
  // Custom validation for multiple fields
  validateMultiple: (...validations) => {
    return (req, res, next) => {
      for (const validation of validations) {
        const result = validation(req, res, () => {});
        if (result) return result;
      }
      next();
    };
  }
};

// Sanitization helper
const sanitize = {
  string: (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  },
  
  email: (email) => {
    if (typeof email !== 'string') return email;
    return email.toLowerCase().trim();
  },
  
  phone: (phone) => {
    if (typeof phone !== 'string') return phone;
    return phone.replace(/[\s-()]/g, '');
  }
};

module.exports = {
  schemas,
  validate,
  validationMiddleware,
  sanitize
};