const { body } = require('express-validator');

exports.createScheduleValidator = [
  body('doctor').notEmpty().withMessage('Doctor ID is required.'),
  body('date')
    .isISO8601().withMessage('Valid date is required.')
    .custom((value) => {
      const selectedDate = new Date(value);
      selectedDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        throw new Error('Schedule date cannot be in the past.');
      }
      return true;
    }),
  body('timeSlots').isArray({ min: 1 }).withMessage('Time slots are required.'),
  body('timeSlots.*.startTime').notEmpty().withMessage('Start time is required for each slot.'),
  body('timeSlots.*.endTime').notEmpty().withMessage('End time is required for each slot.')
];

exports.updateScheduleValidator = [
  body('timeSlots').optional().isArray().withMessage('Time slots must be an array.'),
  body('timeSlots.*.startTime').optional().notEmpty().withMessage('Start time is required for each slot.'),
  body('timeSlots.*.endTime').optional().notEmpty().withMessage('End time is required for each slot.')
];
