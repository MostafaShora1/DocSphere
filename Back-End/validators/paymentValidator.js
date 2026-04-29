const { body } = require('express-validator');

exports.createPaymentValidator = [
  body('appointment').notEmpty().withMessage('Appointment ID is required.'),
  body('currency').optional().isString().withMessage('Currency must be a string.')
];
