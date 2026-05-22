const { validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Schedule = require('../models/Schedule');
const Payment = require('../models/Payment');

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
      .populate({ path: 'doctor', populate: { path: 'specialty' } })
      .populate('patient payment service')
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
      .populate({ path: 'doctor', populate: { path: 'specialty' } })
      .populate('patient payment service')
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
      .populate({ path: 'doctor', populate: { path: 'specialty' } })
      .populate('patient payment service')
      .sort('-createdAt');

    return res.status(200).json({ success: true, count: appointments.length, data: appointments });
  } catch (error) {
    console.error('Appointment error:', error);
    return res.status(500).json({ message: 'Failed to fetch appointments' });
  }
};

exports.getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({ path: 'doctor', populate: { path: 'specialty' } })
      .populate('patient payment');
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

    const patientDuplicate = await Appointment.findOne({
      doctor: doctorProfile._id,
      patient: patientProfile._id,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ message: 'Time slot is already booked by another patient' });
    }

    if (patientDuplicate) {
      return res.status(400).json({ message: 'You already have an appointment at this exact time with this doctor' });
    }

    const appointment = await Appointment.create({
      doctor: doctorProfile._id,
      patient: patientProfile._id,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      reason: req.body.reason,
      service: req.body.service || null
    });



    const selectedDate = new Date(req.body.date);

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const schedule = await Schedule.findOne({
      doctor: doctorProfile._id,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (schedule) {
      const slot = schedule.timeSlots.find(
        s => s.startTime.slice(0, 5) === req.body.startTime.slice(0, 5)
      );

      if (slot) {
        slot.isAvailable = false;
        await schedule.save();
      } else {
        console.log('❌ SLOT NOT FOUND');
      }
    } else {
      console.log('❌ SCHEDULE NOT FOUND');
    }

    // NOTE:
    // Don’t create Stripe PaymentIntent/Payment at booking time.
    // We create payment only when the appointment becomes confirmed (patient payment step).
    res.status(201).json({
      success: true,
      data: appointment
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
    ['status', 'notes', 'rejectionReason'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    let proposedAppointment = null;

    // Doctor rejects: either reject completely OR propose a new slot to the same patient
    if (
      req.user.role === 'doctor' &&
      updates.status === 'rejected' &&
      req.body.proposedDate &&
      req.body.proposedStartTime &&
      req.body.proposedEndTime
    ) {
      proposedAppointment = await Appointment.create({
        doctor: appointment.doctor,
        patient: appointment.patient,
        service: appointment.service || null,
        date: req.body.proposedDate,
        startTime: req.body.proposedStartTime,
        endTime: req.body.proposedEndTime,
        reason: req.body.proposedReason || appointment.reason,
        status: 'pending',
        rejectionReason: null,
        notes: null,
        isRescheduleProposal: true,
        originalAppointment: appointment._id
      });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    // If rejected or cancelled, free the original slot
    if (updates.status === 'rejected' || updates.status === 'cancelled') {
      const appointmentDate = new Date(appointment.date);
      const startOfDay = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate(), 23, 59, 59, 999);

      const schedule = await Schedule.findOne({
        doctor: appointment.doctor,
        date: { $gte: startOfDay, $lte: endOfDay }
      });

      if (schedule) {
        const slot = schedule.timeSlots.find(
          s => s.startTime.slice(0, 5) === appointment.startTime.slice(0, 5)
        );
        if (slot) {
          slot.isAvailable = true;
          await schedule.save();
        }
      }
    }

    // If proposal created, book the new slot
    if (proposedAppointment) {
      const propDate = new Date(proposedAppointment.date);
      const startOfDayP = new Date(propDate.getFullYear(), propDate.getMonth(), propDate.getDate(), 0, 0, 0, 0);
      const endOfDayP = new Date(propDate.getFullYear(), propDate.getMonth(), propDate.getDate(), 23, 59, 59, 999);

      const scheduleP = await Schedule.findOne({
        doctor: proposedAppointment.doctor,
        date: { $gte: startOfDayP, $lte: endOfDayP }
      });

      if (scheduleP) {
        const slotP = scheduleP.timeSlots.find(
          s => s.startTime.slice(0, 5) === proposedAppointment.startTime.slice(0, 5)
        );
        if (slotP) {
          slotP.isAvailable = false;
          await scheduleP.save();
        }
      }
    }

    // Send notification email to patient when doctor confirms/rejects
    if (req.user.role === 'doctor' && (updates.status === 'confirmed' || updates.status === 'rejected')) {
      const patient = await Patient.findById(appointment.patient).populate('user');
      const doctor = await Doctor.findById(appointment.doctor);

      if (patient?.user?.email) {
        const { sendAppointmentStatusEmail } = require('../services/emailService');

        if (updates.status === 'confirmed') {
          await sendAppointmentStatusEmail(
            patient.user.email,
            patient.user.name,
            doctor.name,
            appointment.date,
            appointment.startTime,
            'confirmed'
          );
        } else if (updates.status === 'rejected') {
          if (proposedAppointment) {
            await sendAppointmentStatusEmail(
              patient.user.email,
              patient.user.name,
              doctor.name,
              proposedAppointment.date,
              proposedAppointment.startTime,
              'proposed',
              updates.rejectionReason
            );
          } else {
            await sendAppointmentStatusEmail(
              patient.user.email,
              patient.user.name,
              doctor.name,
              appointment.date,
              appointment.startTime,
              'rejected',
              updates.rejectionReason
            );
          }
        }
      }
    }

    res.status(200).json({ success: true, data: updatedAppointment, proposedAppointment });
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

    // رجّع المعاد متاح تاني
    // Fix date range bug (same issue as create)
    const appointmentDate = new Date(appointment.date);
    const startOfDay = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate(), 23, 59, 59, 999);

    const schedule = await Schedule.findOne({
      doctor: appointment.doctor,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (schedule) {
      const slot = schedule.timeSlots.find(
        s => s.startTime.slice(0, 5) === appointment.startTime.slice(0, 5) &&
          s.endTime.slice(0, 5) === appointment.endTime.slice(0, 5)
      );

      if (slot) {
        slot.isAvailable = true;
        await schedule.save();
      }
    }

    await appointment.deleteOne();
  } catch (error) {
    next(error);
  }
};
