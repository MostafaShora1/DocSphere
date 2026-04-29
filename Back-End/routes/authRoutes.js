const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator
} = require('../validators/authValidator');

// Public routes
router.post('/register', registerValidator, authController.register);
router.post('/verify-email', verifyEmailValidator, authController.verifyEmail);
router.post('/login', loginValidator, authController.login);
router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, authController.resetPassword);

// Example protected route to demonstrate middleware usage
router.get('/protected', protect, (req, res) => {
  res.status(200).json({ message: `Welcome ${req.user.email}, you have access.` });
});

router.get('/me', protect, authController.getMe);
router.put('/update-details', protect, authController.updateDetails);
router.put('/update-password', protect, authController.updatePassword);
router.get('/logout', protect, authController.logout);

module.exports = router;
