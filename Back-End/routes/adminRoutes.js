const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { 
  getAdmins, 
  getUsers, 
  getPendingDoctors, 
  approveDoctor, 
  deactivateDoctor, 
  reactivateDoctor,
  deactivateUser,
  reactivateUser 
} = require('../controllers/adminController');

router.get('/public', getAdmins); // Public route for admins
router.use(protect, authorize('admin'));
router.get('/users', getUsers);
router.put('/deactivate-user/:id', deactivateUser);
router.put('/reactivate-user/:id', reactivateUser);
router.get('/doctors/pending', getPendingDoctors);
router.put('/approve-doctor/:id', approveDoctor);
router.put('/deactivate-doctor/:id', deactivateDoctor);
router.put('/reactivate-doctor/:id', reactivateDoctor);

module.exports = router;
