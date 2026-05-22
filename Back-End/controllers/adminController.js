const User = require('../models/User');
const Doctor = require('../models/Doctor');

exports.getAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('name email').sort('-createdAt');
    res.status(200).json({ success: true, count: admins.length, data: admins });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.isActive = false;
    await user.save();
    res.status(200).json({ success: true, message: 'User deactivated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

exports.reactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.isActive = true;
    await user.save();
    res.status(200).json({ success: true, message: 'User reactivated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

exports.getPendingDoctors = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({ isApproved: false }).populate('user specialty');
    // Filter out orphans
    const validDoctors = doctors.filter(doc => doc.user !== null);
    res.status(200).json({ success: true, count: validDoctors.length, data: validDoctors });
  } catch (error) {
    next(error);
  }
};

exports.approveDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('user specialty');

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    doctor.isApproved = true;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Doctor approved successfully',
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

exports.deactivateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    doctor.isActive = false;
    await doctor.save();

    // Also deactivate the user account
    if (doctor.user) {
      await User.findByIdAndUpdate(doctor.user, { isActive: false });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor deactivated successfully',
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};

exports.reactivateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    doctor.isActive = true;
    await doctor.save();

    // Also reactivate the user account
    if (doctor.user) {
      await User.findByIdAndUpdate(doctor.user, { isActive: true });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor reactivated successfully',
      data: doctor
    });
  } catch (error) {
    next(error);
  }
};
