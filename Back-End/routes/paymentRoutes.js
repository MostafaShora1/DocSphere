const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  createPaymentIntent,
  createCashPayment,
  getStripePublicKey,
  getPayments,
  getPaymentById,
  verifyPaymentStatus,
  stripeWebhook
} = require('../controllers/paymentController');
const { createPaymentValidator } = require('../validators/paymentValidator');

router.post('/intent', protect, authorize('patient'), createPaymentValidator, createPaymentIntent);
router.post('/cash', protect, authorize('patient'), createPaymentValidator, createCashPayment);
router.get('/stripe-public-key', getStripePublicKey);

router.post('/webhook', stripeWebhook);
router.get('/', protect, authorize('admin'), getPayments);
router.get('/verify/:id', protect, authorize('admin', 'patient', 'doctor'), verifyPaymentStatus);
router.get('/:id', protect, getPaymentById);

module.exports = router;
