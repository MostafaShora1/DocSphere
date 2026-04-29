const express = require('express');
const router = express.Router();
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getPatientAppointments,
  getDoctorAppointments
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  createAppointmentValidator,
  updateAppointmentValidator
} = require('../validators/appointmentValidator');

router.get('/patient', protect, getPatientAppointments);
router.get('/doctor', protect, authorize('doctor'), getDoctorAppointments);
router.route('/').get(protect, getAppointments).post(protect, authorize('patient'), createAppointmentValidator, createAppointment);
router.route('/:id').get(protect, getAppointment).put(protect, updateAppointmentValidator, updateAppointment).delete(protect, authorize('patient', 'doctor', 'admin'), deleteAppointment);

module.exports = router;
