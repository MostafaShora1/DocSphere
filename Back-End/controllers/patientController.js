const Patient = require('../models/Patient');

exports.createPatientProfile = async (req, res, next) => {
  try {
    const existingProfile = await Patient.findOne({ user: req.user.id });
    if (existingProfile) {
      return res.status(400).json({ message: 'Patient profile already exists' });
    }

    const patient = await Patient.create({
      user: req.user.id,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      address: req.body.address,
      emergencyContact: req.body.emergencyContact,
      medicalHistory: req.body.medicalHistory,
      allergies: req.body.allergies
    });

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

exports.getMyPatientProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ user: req.user.id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

exports.updatePatientProfile = async (req, res, next) => {
  try {
    const patient = await Patient.findOneAndUpdate({ user: req.user.id }, req.body, {
      new: true,
      runValidators: true
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

exports.getPatients = async (req, res, next) => {
  try {
    const patients = await Patient.find().populate('user');
    res.status(200).json({ success: true, count: patients.length, data: patients });
  } catch (error) {
    next(error);
  }
};
