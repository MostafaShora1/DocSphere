const { body } = require('express-validator');

exports.createPaymentValidator = [
  body('appointment').notEmpty().withMessage('Appointment ID is required.'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number.')
];
