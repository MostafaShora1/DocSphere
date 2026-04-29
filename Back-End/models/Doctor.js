const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    fullName: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true
    },
    specialty: {
      type: mongoose.Schema.ObjectId,
      ref: 'Specialty',
      required: [true, 'Specialty is required']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot be longer than 1000 characters']
    },
    experience: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative']
    },
    qualifications: [String],
    languages: [String],
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required']
    },
    clinicAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    profilePicture: String,
    isApproved: {
      type: Boolean,
      default: false
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  {
    timestamps: true
  }
);

doctorSchema.index({ fullName: 'text', bio: 'text' });

module.exports = mongoose.model('Doctor', doctorSchema);
