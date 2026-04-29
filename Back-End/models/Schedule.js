const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.ObjectId,
      ref: 'Doctor',
      required: true
    },
    date: {
      type: Date,
      required: [true, 'Schedule date is required']
    },
    timeSlots: [
      {
        startTime: {
          type: String,
          required: [true, 'Start time is required']
        },
        endTime: {
          type: String,
          required: [true, 'End time is required']
        },
        isAvailable: {
          type: Boolean,
          default: true
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

scheduleSchema.index({ doctor: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
