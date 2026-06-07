const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../services/emailService');
const { generateJwtToken } = require('../services/tokenService');

// Register new user and send verification email
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, nameAr, nameEn, email, password, phone, phonePrimary, birthDate, role = 'patient' } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: res.__('USER_EXISTS') });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = crypto.randomBytes(3).toString('hex');

    // Ensure name is not empty (especially for doctors where it might be nameEn/nameAr)
    const finalName = name || nameEn || nameAr || email.split('@')[0];

    const user = await User.create({
      name: finalName,
      nameAr,
      nameEn,
      email,
      password: hashedPassword,
      phone: phonePrimary || phone,
      birthDate,
      role,
      isVerified: false,
      verificationCode
    });

    // await sendVerificationEmail(user.email, user.name, verificationCode);

    res.status(201).json({
      message: res.__('REGISTRATION_SUCCESS'),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    next(error);
  }
};

// Verify email with code
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, verificationCode } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: res.__('USER_NOT_FOUND') });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: res.__('EMAIL_VERIFIED_ALREADY') });
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ message: res.__('INVALID_VERIFICATION_CODE') });
    }

    user.isVerified = true;
    user.verificationCode = null;
    await user.save();

    res.status(200).json({ message: res.__('EMAIL_VERIFIED_SUCCESS') });
  } catch (error) {
    next(error);
  }
};

// Login user and return JWT token
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: res.__('INVALID_CREDENTIALS') });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: res.__('INVALID_CREDENTIALS') });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: res.__('EMAIL_NOT_VERIFIED') });
    }

    const token = generateJwtToken(user._id);

    res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
};

// Request password reset link
exports.forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: res.__('RESET_LINK_SENT') });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Use frontend URL from environment or default to Angular dev server
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    await sendResetPasswordEmail(user.email, user.name, resetUrl);

    res.status(200).json({ message: res.__('RESET_LINK_SENT') });
  } catch (error) {
    next(error);
  }
};

// Reset password using token
exports.resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const resetToken = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: res.__('INVALID_RESET_TOKEN') });
    }

    user.password = await bcrypt.hash(req.body.password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.status(200).json({ message: res.__('PASSWORD_RESET_SUCCESS') });
  } catch (error) {
    next(error);
  }
};

exports.verifyResetToken = async (req, res, next) => {
  try {
    const resetToken = req.params.token;
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: res.__('INVALID_RESET_TOKEN') });
    }

    return res.status(200).json({ valid: true, message: res.__('RESET_TOKEN_VALID') });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.updateDetails = async (req, res, next) => {
  try {
    const updates = {
      name: req.body.name,
      email: req.body.email
    };

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    const { currentPassword, newPassword } = req.body;

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: res.__('CURRENT_PASSWORD_INCORRECT') });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.status(200).json({ message: res.__('PASSWORD_UPDATED_SUCCESS') });
  } catch (error) {
    next(error);
  }
};

exports.logout = (req, res, next) => {
  res.status(200).json({ message: res.__('LOGOUT_SUCCESS') });
};
