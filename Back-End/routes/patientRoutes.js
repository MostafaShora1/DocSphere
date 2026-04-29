const express = require('express');
const router = express.Router();
const {
  createPatientProfile,
  getMyPatientProfile,
  updatePatientProfile,
  getPatients
} = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  createPatientValidator,
  updatePatientValidator
} = require('../validators/patientValidator');

router.route('/').get(protect, authorize('admin'), getPatients).post(protect, authorize('patient'), createPatientValidator, createPatientProfile);
router.route('/me').get(protect, authorize('patient'), getMyPatientProfile).put(protect, authorize('patient'), updatePatientValidator, updatePatientProfile);

module.exports = router;
