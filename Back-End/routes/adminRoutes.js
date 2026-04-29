const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { getUsers, getPendingDoctors, approveDoctor } = require('../controllers/adminController');

router.use(protect, authorize('admin'));
router.get('/users', getUsers);
router.get('/doctors/pending', getPendingDoctors);
router.put('/approve-doctor/:id', approveDoctor);

module.exports = router;
