const express = require('express');
const {
  submitMessage,
  getMessages,
  markAsRead
} = require('../controllers/contactController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Route to submit message (now protected)
router.post('/', protect, submitMessage);

// Admin routes (should ideally have protect and authorize middlewares)
// For now, keeping it simple as requested
router.get('/', getMessages);
router.put('/:id/read', markAsRead);

module.exports = router;
