const Message = require('../models/Message');

// @desc    Submit a contact message
// @route   POST /api/v1/contact
// @access  Public
exports.submitMessage = async (req, res, next) => {
  try {
    console.log('Received contact message submission:', req.body);
    const { firstName, lastName, email, phone, message } = req.body;

    const newMessage = await Message.create({
      firstName,
      lastName,
      email,
      phone,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully',
      data: newMessage
    });
  } catch (error) {
    console.error('Error in submitMessage:', error);
    next(error);
  }
};

// @desc    Get all messages (for admin)
// @route   GET /api/v1/contact
// @access  Private/Admin
exports.getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find().sort('-createdAt');

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark message as read
// @route   PUT /api/v1/contact/:id/read
// @access  Private/Admin
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true, runValidators: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};
