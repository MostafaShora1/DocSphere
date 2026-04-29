const express = require('express');
const router = express.Router();
const {
  getSpecialties,
  getSpecialty,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty
} = require('../controllers/specialtyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  createSpecialtyValidator,
  updateSpecialtyValidator
} = require('../validators/specialtyValidator');

router.route('/').get(getSpecialties).post(protect, authorize('admin'), createSpecialtyValidator, createSpecialty);
router.route('/:id').get(getSpecialty).put(protect, authorize('admin'), updateSpecialtyValidator, updateSpecialty).delete(protect, authorize('admin'), deleteSpecialty);

module.exports = router;
