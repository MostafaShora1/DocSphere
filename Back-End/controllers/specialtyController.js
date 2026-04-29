const { validationResult } = require('express-validator');
const Specialty = require('../models/Specialty');

exports.getSpecialties = async (req, res, next) => {
  try {
    const specialties = await Specialty.find().sort('name');
    res.status(200).json({ success: true, count: specialties.length, data: specialties });
  } catch (error) {
    next(error);
  }
};

exports.getSpecialty = async (req, res, next) => {
  try {
    const specialty = await Specialty.findById(req.params.id);
    if (!specialty) {
      return res.status(404).json({ message: 'Specialty not found' });
    }
    res.status(200).json({ success: true, data: specialty });
  } catch (error) {
    next(error);
  }
};

exports.createSpecialty = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const specialty = await Specialty.create(req.body);
    res.status(201).json({ success: true, data: specialty });
  } catch (error) {
    next(error);
  }
};

exports.updateSpecialty = async (req, res, next) => {
  try {
    const specialty = await Specialty.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!specialty) {
      return res.status(404).json({ message: 'Specialty not found' });
    }
    res.status(200).json({ success: true, data: specialty });
  } catch (error) {
    next(error);
  }
};

exports.deleteSpecialty = async (req, res, next) => {
  try {
    const specialty = await Specialty.findById(req.params.id);
    if (!specialty) {
      return res.status(404).json({ message: 'Specialty not found' });
    }
    await specialty.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
