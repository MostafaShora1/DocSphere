const { body } = require('express-validator');

exports.registerValidator = [
  body('name').notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Please provide a valid email.'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.'),
  body('role').optional().isIn(['admin', 'doctor', 'patient']).withMessage('Role must be admin, doctor, or patient.')
];

exports.loginValidator = [
  body('email').notEmpty().withMessage('Email is required.'),
  body('password').notEmpty().withMessage('Password is required.')
];

exports.forgotPasswordValidator = [
  body('email').isEmail().withMessage('Please provide a valid email.')
];

exports.resetPasswordValidator = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long.')
];
