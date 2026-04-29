const express = require('express');
const router = express.Router();
const {
  createReview,
  getDoctorReviews,
  getMyReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { createReviewValidator } = require('../validators/reviewValidator');

router.post('/', protect, authorize('patient'), createReviewValidator, createReview);
router.get('/doctor/:doctorId', getDoctorReviews);
router.get('/me', protect, authorize('patient'), getMyReviews);

module.exports = router;
