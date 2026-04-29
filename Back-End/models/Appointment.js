const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.ObjectId,
      ref: 'Doctor',
      required: true
    },
    patient: {
      type: mongoose.Schema.ObjectId,
      ref: 'Patient',
      required: true
    },
    date: {
      type: Date,
      required: [true, 'Appointment date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String,
      required: [true, 'End time is required']
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending'
    },
    reason: {
      type: String,
      required: [true, 'Appointment reason is required']
    },
    notes: String,
    payment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Payment'
    }
  },
  {
    timestamps: true
  }
);

appointmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
