const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (options) => {
  const mailOptions = {
    from: `Auth System <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

exports.sendVerificationEmail = async (to, name, code) => {
  const html = `
    <h2>Hello ${name}</h2>
    <p>Thank you for registering. Use the following code to verify your email address:</p>
    <p><strong>${code}</strong></p>
    <p>If you did not request this, please ignore this message.</p>
  `;

  await sendEmail({
    to,
    subject: 'Verify Your Email Address',
    html
  });
};

exports.sendResetPasswordEmail = async (to, name, resetUrl) => {
  const html = `
    <h2>Hello ${name}</h2>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>This link expires in one hour.</p>
    <p>If you did not request a reset, please ignore this email.</p>
  `;

  await sendEmail({
    to,
    subject: 'Reset Your Password',
    html
  });
};

exports.sendAppointmentStatusEmail = async (
  to,
  patientName,
  doctorName,
  appointmentDate,
  appointmentTime,
  status,
  rejectionReason = null
) => {
  let subject = '';
  let html = '';

  const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (status === 'confirmed') {
    subject = 'Appointment Confirmed';
    html = `
      <h2>Hello ${patientName}</h2>
      <p>Your appointment with Dr. ${doctorName} has been confirmed.</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
      <p>Please arrive 15 minutes before your scheduled time.</p>
      <p>If you need to reschedule, please contact us or cancel from your patient portal.</p>
    `;
  } else if (status === 'rejected') {
    subject = 'Appointment Rejected';
    html = `
      <h2>Hello ${patientName}</h2>
      <p>We regret to inform you that your appointment with Dr. ${doctorName} has been rejected.</p>
      <p><strong>Original Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
      ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
      <p>Please book a new appointment with a different time slot or doctor through your patient portal.</p>
    `;
  }

  await sendEmail({
    to,
    subject,
    html
  });
};
