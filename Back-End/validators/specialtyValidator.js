const { body } = require('express-validator');

exports.createSpecialtyValidator = [
  body('name').notEmpty().withMessage('Specialty name is required.'),
  body('description').notEmpty().withMessage('Specialty description is required.')
];

exports.updateSpecialtyValidator = [
  body('name').optional().notEmpty().withMessage('Specialty name cannot be empty.'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty.')
];
