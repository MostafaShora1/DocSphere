const { body } = require('express-validator');

exports.createPatientValidator = [
  body('firstName').notEmpty().withMessage('First name is required.'),
  body('lastName').notEmpty().withMessage('Last name is required.'),
  body('phone').notEmpty().withMessage('Phone number is required.')
];

exports.updatePatientValidator = [
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty.')
];
