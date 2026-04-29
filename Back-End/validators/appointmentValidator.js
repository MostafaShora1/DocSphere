const { body } = require('express-validator');

exports.createAppointmentValidator = [
  body('doctor').notEmpty().withMessage('Doctor ID is required.'),
  body('date').isISO8601().withMessage('Valid appointment date is required.'),
  body('startTime').notEmpty().withMessage('Start time is required.'),
  body('endTime').notEmpty().withMessage('End time is required.'),
  body('reason').notEmpty().withMessage('Appointment reason is required.')
];

exports.updateAppointmentValidator = [
  body('status').optional().isIn(['pending', 'confirmed', 'completed', 'cancelled']).withMessage('Invalid appointment status.'),
  body('notes').optional().isString().withMessage('Notes must be a string.')
];
