const { Resend } = require("resend");

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  throw new Error("❌ RESEND_API_KEY is missing in environment variables");
}

const resend = new Resend(RESEND_API_KEY);

// 🔥 استخدم verified domain في production
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "Auth System <onboarding@resend.dev>";

/**
 * Generic send email function
 */
const sendEmail = async (options) => {
  try {
    console.log("📧 Sending email...", {
      to: options.to,
      subject: options.subject,
    });

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    // ❗ Resend response structure fix
    if (response?.error) {
      console.error("❌ Resend API error:", response.error);
      return null;
    }

    console.log("✅ Email sent successfully:", {
      id: response?.data?.id,
    });

    return response;
  } catch (error) {
    console.error("❌ Failed to send email:", {
      message: error?.message,
      stack: error?.stack,
    });

    return null;
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
      <p>Please arrive 15 minutes early.</p>
    `;
  } 
  
  else if (status === "rejected") {
    subject = "Appointment Rejected";
    html = `
      <h2>Hello ${patientName}</h2>
      <p>Your appointment with Dr. ${doctorName} was rejected.</p>
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
      <p>Dr. ${doctorName} suggested a new time.</p>
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