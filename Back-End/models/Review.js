const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true
    },
    patient: {
      type: mongoose.Schema.ObjectId,
      ref: 'Patient',
      required: true
    },
    doctor: {
      type: mongoose.Schema.ObjectId,
      ref: 'Doctor',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Comment cannot be more than 500 characters']
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.statics.getAverageRating = async function (doctorId) {
  const aggregation = await this.aggregate([
    { $match: { doctor: doctorId } },
    { $group: { _id: '$doctor', averageRating: { $avg: '$rating' } } },
    { $addFields: { averageRating: { $round: ['$averageRating', 1] } } }
  ]);

  try {
    await this.model('Doctor').findByIdAndUpdate(doctorId, {
      averageRating: aggregation[0] ? aggregation[0].averageRating : 0
    });
  } catch (error) {
    console.error(error);
  }
};

reviewSchema.post('save', function () {
  this.constructor.getAverageRating(this.doctor);
});

reviewSchema.pre('remove', function (next) {
  this.constructor.getAverageRating(this.doctor);
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
