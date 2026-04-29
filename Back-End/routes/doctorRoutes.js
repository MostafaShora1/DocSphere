const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctor,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  approveDoctor,
  searchDoctors
} = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  createDoctorValidator,
  updateDoctorValidator
} = require('../validators/doctorValidator');

router.get('/search/:query', searchDoctors);
router.route('/').get(getDoctors).post(protect, authorize('doctor'), createDoctorValidator, createDoctor);
router
  .route('/:id')
  .get(getDoctor)
  .put(protect, updateDoctorValidator, updateDoctor)
  .delete(protect, authorize('admin'), deleteDoctor);
router.put('/:id/approve', protect, authorize('admin'), approveDoctor);

module.exports = router;
