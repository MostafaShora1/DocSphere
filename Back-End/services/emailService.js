const nodemailer = require("nodemailer");

// 🔥 Gmail transporter (production safe)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ تأكد إن الاتصال شغال أول ما السيرفر يقوم
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP connection error:", error.message);
  } else {
    console.log("✅ Gmail SMTP ready");
  }
});

// ==========================
// 📧 Generic send email
// ==========================
const sendEmail = async (options) => {
  try {
    console.log("📧 Sending email to:", options.to);

    const mailOptions = {
      from: `Auth System <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully:", info.messageId);

    return info;
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    throw error;
  }
};

// ==========================
// 📩 EMAIL TEMPLATES
// ==========================

exports.sendVerificationEmail = async (to, name, code) => {
  const html = `
    <h2>Hello ${name}</h2>
    <p>Thank you for registering. Use the following code to verify your email address:</p>
    <h1>${code}</h1>
    <p>If you did not request this, please ignore this message.</p>
  `;

  return sendEmail({
    to,
    subject: "Verify Your Email Address",
    html,
  });
};

exports.sendResetPasswordEmail = async (to, name, resetUrl) => {
  const html = `
    <h2>Hello ${name}</h2>
    <p>You requested a password reset. Click the link below:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>This link expires in one hour.</p>
  `;

  return sendEmail({
    to,
    subject: "Reset Your Password",
    html,
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
  const formattedDate = new Date(appointmentDate).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  let subject = "";
  let html = "";

  if (status === "confirmed") {
    subject = "Appointment Confirmed";
    html = `
      <h2>Hello ${patientName}</h2>
      <p>Your appointment with Dr. ${doctorName} has been confirmed.</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
      <p>Please arrive 15 minutes before your scheduled time.</p>
    `;
  } 
  
  else if (status === "rejected") {
    subject = "Appointment Rejected";
    html = `
      <h2>Hello ${patientName}</h2>
      <p>Your appointment with Dr. ${doctorName} has been rejected.</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
      ${
        rejectionReason
          ? `<p><strong>Reason:</strong> ${rejectionReason}</p>`
          : ""
      }
    `;
  } 
  
  else if (status === "proposed") {
    subject = "Appointment Reschedule Proposal";
    html = `
      <h2>Hello ${patientName}</h2>
      <p>Dr. ${doctorName} suggested a new time for your appointment.</p>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${appointmentTime}</p>
      ${
        rejectionReason
          ? `<p><strong>Reason:</strong> ${rejectionReason}</p>`
          : ""
      }
    `;
  }

  return sendEmail({
    to,
    subject,
    html,
  });
};