const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    if (field) {
      message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    }
    
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      statusCode: 401
    };
  }

  // MongoDB connection errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    error = {
      message: 'Database connection error',
      statusCode: 500
    };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      message: 'File size too large',
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      message: 'Unexpected file field',
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    error = {
      message: 'Too many requests, please try again later',
      statusCode: 429
    };
  }

  // Socket.IO errors
  if (err.type === 'entity.parse.failed') {
    error = {
      message: 'Invalid JSON format',
      statusCode: 400
    };
  }

  // Default error response
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't expose sensitive error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    message: message,
    ...(isDevelopment && {
      error: err.message,
      stack: err.stack,
      details: error
    })
  };

  res.status(statusCode).json(errorResponse);
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class
class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error creators
const createError = (message, statusCode = 500) => {
  return new CustomError(message, statusCode);
};

const badRequest = (message = 'Bad Request') => {
  return new CustomError(message, 400);
};

const unauthorized = (message = 'Unauthorized') => {
  return new CustomError(message, 401);
};

const forbidden = (message = 'Forbidden') => {
  return new CustomError(message, 403);
};

const notFound = (message = 'Not Found') => {
  return new CustomError(message, 404);
};

const conflict = (message = 'Conflict') => {
  return new CustomError(message, 409);
};

const unprocessableEntity = (message = 'Unprocessable Entity') => {
  return new CustomError(message, 422);
};

const tooManyRequests = (message = 'Too Many Requests') => {
  return new CustomError(message, 429);
};

const internalServerError = (message = 'Internal Server Error') => {
  return new CustomError(message, 500);
};

const serviceUnavailable = (message = 'Service Unavailable') => {
  return new CustomError(message, 503);
};

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', {
    error: err.message,
    stack: err.stack,
    promise: promise
  });
  
  // Close server & exit process
  // server.close(() => {
  //   process.exit(1);
  // });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
  
  process.exit(1);
});

module.exports = {
  errorHandler,
  asyncHandler,
  CustomError,
  createError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  serviceUnavailable
};