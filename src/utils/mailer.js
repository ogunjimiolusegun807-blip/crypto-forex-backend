// Nodemailer setup for sending emails
import nodemailer from 'nodemailer';

// Build transporter only when SMTP configuration is available. In some deployed
// preview/demo environments the SMTP credentials are intentionally not provided
// (to avoid leaking secrets). Instead of throwing, we gracefully log the
// reset link so developers can copy it from server logs during testing.
const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter = null;
if (hasSMTP) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  // Provide a no-op transporter with a sendMail that logs the mail instead of throwing.
  transporter = {
    sendMail: async (mailOptions) => {
      console.warn('SMTP not configured - password reset email not sent. Mail preview:');
      console.warn(JSON.stringify(mailOptions, null, 2));
      return Promise.resolve({ accepted: [mailOptions.to] });
    }
  };
}

export async function sendPasswordResetEmail(to, resetLink) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@elonbroker.com',
    to,
    subject: 'Password Reset Request',
    html: `<p>You requested a password reset. Click the link below to set a new password:</p>
           <p><a href="${resetLink}">${resetLink}</a></p>
           <p>If you did not request this, please ignore this email.</p>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // Log a friendly note for developers in non-production environments
    if (!hasSMTP) {
      console.info(`Password reset link for ${to}: ${resetLink}`);
    }
    return info;
  } catch (err) {
    console.error('Error sending password reset email:', err);
    // Re-throw so callers can decide how to respond (auth route will catch and return 500)
    throw err;
  }
}
