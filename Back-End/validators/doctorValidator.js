const { body } = require('express-validator');

exports.createDoctorValidator = [
  body('fullName').notEmpty().withMessage('Doctor full name is required.'),
  body('specialty').notEmpty().withMessage('Specialty is required.'),
  body('consultationFee').isNumeric().withMessage('Consultation fee must be a number.')
];

exports.updateDoctorValidator = [
  body('consultationFee').optional().isNumeric().withMessage('Consultation fee must be a number.'),
  body('experience').optional().isNumeric().withMessage('Experience must be a number.')
];
