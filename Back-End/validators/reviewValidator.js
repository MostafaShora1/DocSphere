const { body } = require('express-validator');

exports.createReviewValidator = [
  body('appointment').notEmpty().withMessage('Appointment ID is required.'),
  body('doctor').notEmpty().withMessage('Doctor ID is required.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('comment').optional().isString().withMessage('Comment must be a string.')
];
