const { validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Payment = require('../models/Payment');
const { createPaymentIntent } = require('../services/paymentService');

exports.getAppointments = async (req, res, next) => {
  try {
    const filters = {};

    if (req.user.role === 'patient') {
      const patientProfile = await Patient.findOne({ user: req.user.id });
      filters.patient = patientProfile ? patientProfile._id : null;
    }

    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user.id });
      filters.doctor = doctorProfile ? doctorProfile._id : null;
    }

    const appointments = await Appointment.find(filters)
      .populate('doctor patient payment')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    next(error);
  }
};

exports.getPatientAppointments = async (req, res, next) => {
  try {
    console.log('User:', req.user);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const patientProfile = await Patient.findOne({ user: req.user.id });
    if (!patientProfile) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const appointments = await Appointment.find({ patient: patientProfile._id })
      .populate('doctor patient payment')
      .sort('-createdAt');

    return res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error('Appointment error:', error);
    return res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};

exports.getDoctorAppointments = async (req, res, next) => {
  try {
    console.log('User:', req.user);

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const doctorProfile = await Doctor.findOne({ user: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }

    const appointments = await Appointment.find({ doctor: doctorProfile._id })
      .populate('doctor patient payment')
      .sort('-createdAt');

    return res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error('Appointment error:', error);
    return res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};

exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('doctor patient payment');
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role === 'patient') {
      const patientProfile = await Patient.findOne({ user: req.user.id });
      if (!patientProfile || appointment.patient.toString() !== patientProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this appointment' });
      }
    }

    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user.id });
      if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this appointment' });
      }
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patientProfile = await Patient.findOne({ user: req.user.id });
    if (!patientProfile) {
      return res.status(400).json({ message: 'Patient profile is required to book appointments' });
    }

    const doctorProfile = await Doctor.findById(req.body.doctor);
    if (!doctorProfile || !doctorProfile.isApproved) {
      return res.status(404).json({ message: 'Approved doctor not found' });
    }

    const conflictingAppointment = await Appointment.findOne({
      doctor: doctorProfile._id,
      date: req.body.date,
      startTime: { $lt: req.body.endTime },
      endTime: { $gt: req.body.startTime },
      status: { $ne: 'cancelled' }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ message: 'Time slot is already booked' });
    }

    const appointment = await Appointment.create({
      doctor: doctorProfile._id,
      patient: patientProfile._id,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      reason: req.body.reason
    });

    const paymentIntent = await createPaymentIntent(doctorProfile.consultationFee);

    const payment = await Payment.create({
      appointment: appointment._id,
      patient: patientProfile._id,
      doctor: doctorProfile._id,
      amount: doctorProfile.consultationFee,
      currency: 'usd',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id
    });

    appointment.payment = payment._id;
    await appointment.save();

    res.status(201).json({
      success: true,
      data: appointment,
      paymentIntent: {
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role === 'patient') {
      const patientProfile = await Patient.findOne({ user: req.user.id });
      if (!patientProfile || appointment.patient.toString() !== patientProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this appointment' });
      }
    }

    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user.id });
      if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this appointment' });
      }
    }

    const updates = {};
    ['status', 'notes'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: updatedAppointment });
  } catch (error) {
    next(error);
  }
};

exports.deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (req.user.role === 'patient') {
      const patientProfile = await Patient.findOne({ user: req.user.id });
      if (!patientProfile || appointment.patient.toString() !== patientProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this appointment' });
      }
    }

    if (req.user.role === 'doctor') {
      const doctorProfile = await Doctor.findOne({ user: req.user.id });
      if (!doctorProfile || appointment.doctor.toString() !== doctorProfile._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this appointment' });
      }
    }

    await appointment.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
