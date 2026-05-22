const Doctor = require('../models/Doctor');
const Specialty = require('../models/Specialty');

exports.getDoctors = async (req, res, next) => {
  try {
    const queryObj = { ...req.query };
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach((param) => delete queryObj[param]);

    if (queryObj.specialty) {
      queryObj.specialty = queryObj.specialty;
    }

    // Handle 'all' for boolean filters
    if (queryObj.isApproved === 'all') delete queryObj.isApproved;
    if (queryObj.isActive === 'all') delete queryObj.isActive;

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);

    let query = Doctor.find(JSON.parse(queryStr)).populate('user specialty');

    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const total = await Doctor.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    const doctors = await query;
    // Filter out orphans
    const validDoctors = doctors.filter(doc => doc.user !== null);

    const pagination = {};
    if (startIndex + limit < total) {
      pagination.next = { page: page + 1, limit };
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit };
    }

    res.status(200).json({ success: true, count: validDoctors.length, pagination, data: validDoctors });
  } catch (error) {
    next(error);
  }
};

exports.getDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate('user specialty');
    if (!doctor) {
      return res.status(404).json({ message: res.__('DOCTOR_NOT_FOUND') });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

exports.createDoctor = async (req, res, next) => {
  try {
    const existingDoctor = await Doctor.findOne({ user: req.user.id });
    if (existingDoctor) {
      return res.status(400).json({ message: res.__('DOCTOR_PROFILE_EXISTS') });
    }

    const specialty = await Specialty.findById(req.body.specialty);
    if (!specialty) {
      return res.status(404).json({ message: res.__('SPECIALTY_NOT_FOUND') });
    }

    const doctor = await Doctor.create({
      user: req.user.id,
      fullName: req.body.fullName,
      fullNameAr: req.body.fullNameAr,
      fullNameEn: req.body.fullNameEn,
      specialty: req.body.specialty,
      bio: req.body.bio,
      experience: req.body.experience,
      consultationFee: req.body.consultationFee,
      qualifications: req.body.qualifications,
      languages: req.body.languages,
      clinicAddress: req.body.clinicAddress,
      profilePicture: req.body.profilePicture,
      certificate: req.body.certificate
    });

    res.status(201).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

exports.updateDoctor = async (req, res, next) => {
  try {
    let doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: res.__('DOCTOR_NOT_FOUND') });
    }

    if (doctor.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: res.__('NOT_AUTHORIZED') });
    }

    doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: res.__('DOCTOR_NOT_FOUND') });
    }

    await doctor.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

exports.approveDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: res.__('DOCTOR_NOT_FOUND') });
    }

    doctor.isApproved = true;
    await doctor.save();

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

exports.searchDoctors = async (req, res, next) => {
  try {
    const query = req.params.query;
    const doctors = await Doctor.find({ $text: { $search: query }, isApproved: true }).populate('user specialty').limit(20);
    // Filter out orphans
    const validDoctors = doctors.filter(doc => doc.user !== null);

    res.status(200).json({ success: true, count: validDoctors.length, data: validDoctors });
  } catch (error) {
    next(error);
  }
};
