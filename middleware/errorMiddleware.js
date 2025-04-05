const { handleError } = require('../services/errorService');
const logger = require('../config/logger');

module.exports = (err, req, res, next) => {
  // Handle validation errors from express-validator
  if (err.name === 'ValidationError' || err.name === 'ValidatorError') {
    return handleError(res, 422, 'Validation failed', err);
  }

  // Handle JWT authentication errors
  if (err.name === 'JsonWebTokenError') {
    return handleError(res, 401, 'Invalid token', err);
  }

  // Handle database errors
  if (err.code === '23505') {
    // Unique constraint violation
    return handleError(res, 409, 'Duplicate entry detected', err);
  }

  // Handle custom errors
  if (err.isOperational) {
    return handleError(res, err.statusCode, err.message, err);
  }

  // Generic error handling
  logger.error(`Unhandled Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Send generic error in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong!'
      : err.message;

  return handleError(res, err.statusCode || 500, message);
};
