const Doctor = require('../models/Doctor');
const Schedule = require('../models/Schedule');

const getWeekday = (date) => {
  try {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return '';
  }
};

exports.getServices = async (req, res, next) => {
  try {
    const doctors = await Doctor.find({ isApproved: true }).populate('specialty').lean();

    const doctorIds = doctors.map((doctor) => doctor._id);
    const schedules = await Schedule.find({ doctor: { $in: doctorIds } }).lean();

    const availabilityMap = {};
    schedules.forEach((schedule) => {
      const doctorId = schedule.doctor.toString();
      if (!availabilityMap[doctorId]) {
        availabilityMap[doctorId] = {
          days: new Set(),
          times: new Set()
        };
      }

      const day = getWeekday(schedule.date);
      if (day) {
        availabilityMap[doctorId].days.add(day);
      }

      (schedule.timeSlots || []).forEach((slot) => {
        if (slot.isAvailable && slot.startTime) {
          availabilityMap[doctorId].times.add(slot.startTime);
        }
      });
    });

    const services = doctors.map((doctor) => {
      const availability = availabilityMap[doctor._id.toString()] || {
        days: new Set(),
        times: new Set()
      };

      // Ensure we get a proper specialty name, not the doctor's name
      let specialtyName = 'Medical';
      if (doctor.specialty) {
        specialtyName = typeof doctor.specialty === 'object' ? (doctor.specialty.name || 'Medical') : doctor.specialty;
      }
      
      // If specialtyName is just the doctor's name, fallback to 'Specialist'
      if (doctor.fullName && specialtyName.toLowerCase().includes(doctor.fullName.toLowerCase())) {
        specialtyName = 'Specialist';
      }

      return {
        id: doctor._id.toString(),
        name: `${specialtyName} Consultation`,
        nameKey: `SERVICES.${specialtyName.toUpperCase().split(' ').join('_')}_CONSULTATION`,
        description: doctor.bio && doctor.bio.length > 20 ? doctor.bio : `Professional ${specialtyName.toLowerCase()} consultation with our highly qualified specialist.`,
        descriptionKey: `SERVICES.${specialtyName.toUpperCase().split(' ').join('_')}_DESC`,
        duration: '30 min',
        price: doctor.consultationFee || 0,
        doctorId: doctor._id.toString(),
        isActive: doctor.isApproved,
        availableDays: Array.from(availability.days),
        availableTimes: Array.from(availability.times)
      };
    });

    res.status(200).json({
      success: true,
      count: services.length,
      data: { services }
    });
  } catch (error) {
    next(error);
  }
};
