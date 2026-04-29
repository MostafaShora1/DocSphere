const { validationResult } = require('express-validator');
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

exports.createReview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patientProfile = await Patient.findOne({ user: req.user.id });
    if (!patientProfile) {
      return res.status(400).json({ message: 'Patient profile is required to leave a review' });
    }

    const appointment = await Appointment.findById(req.body.appointment);
    if (!appointment || appointment.patient.toString() !== patientProfile._id.toString()) {
      return res.status(404).json({ message: 'Appointment not found or not owned by patient' });
    }

    const doctorProfile = await Doctor.findById(req.body.doctor);
    if (!doctorProfile) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const existingReview = await Review.findOne({ appointment: appointment._id });
    if (existingReview) {
      return res.status(400).json({ message: 'Review already exists for this appointment' });
    }

    const review = await Review.create({
      appointment: appointment._id,
      patient: patientProfile._id,
      doctor: doctorProfile._id,
      rating: req.body.rating,
      comment: req.body.comment
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

exports.getDoctorReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ doctor: req.params.doctorId }).populate('patient doctor');
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

exports.getMyReviews = async (req, res, next) => {
  try {
    const patientProfile = await Patient.findOne({ user: req.user.id });
    if (!patientProfile) {
      return res.status(404).json({ message: 'Patient profile not found' });
    }

    const reviews = await Review.find({ patient: patientProfile._id }).populate('doctor appointment');
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};
