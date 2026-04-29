const { body } = require('express-validator');

exports.createAppointmentValidator = [
  body('doctor').notEmpty().withMessage('Doctor ID is required.'),
  body('date').isISO8601().withMessage('Valid appointment date is required.'),
  body('startTime').notEmpty().withMessage('Start time is required.'),
  body('endTime').notEmpty().withMessage('End time is required.'),
  body('reason').notEmpty().withMessage('Appointment reason is required.'),
  body('service').optional().isMongoId().withMessage('Invalid service ID.')
];

exports.updateAppointmentValidator = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'completed', 'cancelled', 'rejected'])
    .withMessage('Invalid appointment status.'),
  body('notes').optional().isString().withMessage('Notes must be a string.'),
  body('rejectionReason').optional().isString().withMessage('Rejection reason must be a string.'),

  // Optional reschedule proposal payload (sent when doctor rejects with new slot)
  body('proposedDate')
    .optional()
    .isISO8601()
    .withMessage('Valid proposed appointment date is required.'),
  body('proposedStartTime')
    .optional()
    .notEmpty()
    .withMessage('Proposed start time is required.'),
  body('proposedEndTime')
    .optional()
    .notEmpty()
    .withMessage('Proposed end time is required.'),
  body('proposedReason')
    .optional()
    .isString()
    .withMessage('Proposed reason must be a string.')
];
