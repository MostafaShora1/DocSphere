const { validationResult } = require('express-validator');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const {
  createPaymentIntent,
  retrievePaymentIntent,
  constructEvent
} = require('../services/paymentService');

/**
 * Helper function to safely compare ObjectIds
 */
const isOwner = (userId, owner) => {
  if (!owner) return false;

  // لو populated
  if (owner._id) {
    return owner._id.toString() === userId.toString();
  }

  // لو ObjectId مباشر
  return owner.toString() === userId.toString();
};

exports.createPaymentIntent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const appointment = await Appointment.findById(req.body.appointment)
      .populate({ path: 'doctor', select: 'consultationFee' })
      .populate({
        path: 'patient',
        populate: { path: 'user', select: '_id' }
      });

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found'
      });
    }

    /**
     * Ownership check
     */
    if (
      !appointment.patient ||
      !appointment.patient.user ||
      !isOwner(req.user._id, appointment.patient.user)
    ) {
      return res.status(403).json({
        message: 'Not authorized to pay for this appointment'
      });
    }

    /**
     * Prevent duplicate payment
     */
    if (appointment.payment) {
      return res.status(400).json({
        message: 'Payment already exists for this appointment'
      });
    }

    /**
     * Validate amount
     */
    if (
      !appointment.doctor ||
      typeof appointment.doctor.consultationFee !== 'number'
    ) {
      return res.status(400).json({
        message: 'Unable to determine appointment amount'
      });
    }

    const amount = appointment.doctor.consultationFee;
    const currency = req.body.currency || 'usd';

    /**
     * Create Stripe PaymentIntent
     */
    const paymentIntent = await createPaymentIntent(
      amount,
      currency,
      {
        appointmentId: appointment._id.toString(),
        patientId: appointment.patient.user._id.toString(),
        doctorId: appointment.doctor._id.toString()
      }
    );

    /**
     * Create payment record
     */
    const payment = await Payment.create({
      appointment: appointment._id,
      patient: appointment.patient._id,
      doctor: appointment.doctor._id,
      amount,
      currency,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending'
    });

    /**
     * Atomic update to prevent race condition
     */
    const updatedAppointment = await Appointment.findOneAndUpdate(
      {
        _id: appointment._id,
        $or: [
          { payment: { $exists: false } },
          { payment: null }
        ]
      },
      {
        payment: payment._id
      },
      {
        new: true
      }
    );

    if (!updatedAppointment) {
      await Payment.findByIdAndDelete(payment._id);

      return res.status(409).json({
        message: 'Payment already exists for this appointment'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paymentId: payment._id,
        status: payment.status
      }
    });

  } catch (error) {

    if (
      error.code === 11000 &&
      error.keyValue &&
      error.keyValue.appointment
    ) {
      return res.status(409).json({
        message: 'Payment already exists for this appointment'
      });
    }

    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {

    const payments = await Payment.find()
      .populate('appointment patient doctor')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });

  } catch (error) {
    next(error);
  }
};

exports.getPaymentById = async (req, res, next) => {
  try {

    const payment = await Payment.findById(req.params.id)
      .populate('appointment')
      .populate({
        path: 'patient',
        populate: { path: 'user', select: '_id' }
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: '_id' }
      });

    if (!payment) {
      return res.status(404).json({
        message: 'Payment not found'
      });
    }

    /**
     * Patient authorization
     */
    if (
      req.user.role === 'patient' &&
      !isOwner(req.user._id, payment.patient?.user)
    ) {
      return res.status(403).json({
        message: 'Not authorized to view this payment'
      });
    }

    /**
     * Doctor authorization
     */
    if (
      req.user.role === 'doctor' &&
      !isOwner(req.user._id, payment.doctor?.user)
    ) {
      return res.status(403).json({
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    next(error);
  }
};

exports.verifyPaymentStatus = async (req, res, next) => {
  try {

    const payment = await Payment.findById(req.params.id)
      .populate('appointment')
      .populate({
        path: 'patient',
        populate: { path: 'user', select: '_id' }
      })
      .populate({
        path: 'doctor',
        populate: { path: 'user', select: '_id' }
      });

    if (!payment) {
      return res.status(404).json({
        message: 'Payment not found'
      });
    }

    /**
     * Authorization
     */
    if (
      req.user.role === 'patient' &&
      !isOwner(req.user._id, payment.patient?.user)
    ) {
      return res.status(403).json({
        message: 'Not authorized to view this payment'
      });
    }

    if (
      req.user.role === 'doctor' &&
      !isOwner(req.user._id, payment.doctor?.user)
    ) {
      return res.status(403).json({
        message: 'Not authorized to view this payment'
      });
    }

    /**
     * Verify with Stripe
     */
    if (payment.stripePaymentIntentId) {

      const stripeIntent =
        await retrievePaymentIntent(
          payment.stripePaymentIntentId
        );

      if (
        stripeIntent.status === 'succeeded' &&
        payment.status !== 'paid'
      ) {
        const charge =
          stripeIntent.charges?.data?.[0];

        payment.status = 'paid';

        payment.transactionId =
          charge?.id ||
          payment.transactionId;

        payment.paymentMethod =
          charge?.payment_method_details?.type ||
          payment.paymentMethod;

        payment.paidAt =
          payment.paidAt ||
          new Date();

        await payment.save();
      }

      else if (
        ['canceled', 'requires_payment_method']
          .includes(stripeIntent.status) &&
        payment.status !== 'failed'
      ) {
        payment.status = 'failed';

        await payment.save();
      }
    }

    res.status(200).json({
      success: true,
      isPaid: payment.status === 'paid',
      status: payment.status,
      data: payment
    });

  } catch (error) {
    next(error);
  }
};

exports.stripeWebhook = async (req, res, next) => {
  try {

    const sig =
      req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({
        message:
          'Stripe signature header is required'
      });
    }

    const event =
      constructEvent(req.rawBody, sig);

    const paymentIntent =
      event.data.object;

    const payment =
      await Payment.findOne({
        stripePaymentIntentId:
          paymentIntent.id
      });

    if (!payment) {
      return res.status(200).json({
        received: true
      });
    }

    if (
      event.type ===
      'payment_intent.succeeded'
    ) {
      if (payment.status !== 'paid') {

        const charge =
          paymentIntent.charges?.data?.[0];

        payment.status = 'paid';

        payment.transactionId =
          charge?.id ||
          payment.transactionId;

        payment.paymentMethod =
          charge?.payment_method_details?.type ||
          payment.paymentMethod;

        payment.paidAt =
          payment.paidAt ||
          new Date();

        await payment.save();
      }
    }

    else if (
      [
        'payment_intent.payment_failed',
        'payment_intent.canceled',
        'charge.failed'
      ].includes(event.type)
    ) {
      if (payment.status !== 'failed') {

        payment.status = 'failed';

        await payment.save();
      }
    }

    res.status(200).json({
      received: true
    });

  } catch (error) {
    next(error);
  }
};