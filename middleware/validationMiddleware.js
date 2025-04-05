const { body, validationResult } = require('express-validator');

exports.validateRegistration = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

exports.validateOrderCreation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('delivery_address').notEmpty().withMessage('Delivery address is required'),
];

exports.validateIngredientsCreation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('description').notEmpty().withMessage('Description is required')
];