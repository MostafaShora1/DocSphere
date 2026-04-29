const express = require('express');
const router = express.Router();
const {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule
} = require('../controllers/scheduleController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  createScheduleValidator,
  updateScheduleValidator
} = require('../validators/scheduleValidator');

router.route('/').get(getSchedules).post(protect, authorize('doctor'), createScheduleValidator, createSchedule);
router.route('/:id').get(getSchedule).put(protect, authorize('doctor'), updateScheduleValidator, updateSchedule).delete(protect, authorize('doctor'), deleteSchedule);

module.exports = router;
