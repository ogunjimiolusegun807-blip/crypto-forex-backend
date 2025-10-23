// Nodemailer setup for sending emails
import nodemailer from 'nodemailer';

// Build transporter only when SMTP configuration is available. In some deployed
// preview/demo environments the SMTP credentials are intentionally not provided
// (to avoid leaking secrets). Instead of throwing, we gracefully log the
// reset link so developers can copy it from server logs during testing.
const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter = null;
if (hasSMTP) {
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const useSecure = smtpPort === 465; // port 465 uses implicit TLS
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: useSecure,
    requireTLS: !useSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Helpful timeouts and debug options to avoid hanging in production
    connectionTimeout: Number(process.env.SMTP_CONN_TIMEOUT) || 10000,
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 10000,
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT) || 10000,
    logger: !!process.env.SMTP_DEBUG,
    debug: !!process.env.SMTP_DEBUG,
    tls: {
      // Allow older servers if necessary; keep true for strict verification when possible
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
    }
  });

  // Verify transporter connection and log result (non-blocking)
  transporter.verify().then(() => {
    console.info('SMTP transporter verified successfully');
  }).catch((err) => {
    console.warn('SMTP transporter verification failed:', err && err.message ? err.message : err);
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
    console.info('Attempting to send password reset email...');
    console.info('Mail options:', JSON.stringify(mailOptions, null, 2));
  // Add a timeout wrapper so sendMail can't hang indefinitely
  const sendPromise = transporter.sendMail(mailOptions);
  const timeoutMs = Number(process.env.SMTP_SEND_TIMEOUT) || 15000;
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('sendMail timeout')), timeoutMs));
  const info = await Promise.race([sendPromise, timeoutPromise]);
    console.info('SendMail response:', info);
    if (!hasSMTP) {
      console.info(`Password reset link for ${to}: ${resetLink}`);
    }
    return info;
  } catch (err) {
    console.error('Error sending password reset email:', err);
    console.error('Mail options at error:', JSON.stringify(mailOptions, null, 2));
    if (!hasSMTP) {
      console.info(`Password reset link for ${to}: ${resetLink}`);
    }
    throw err;
  }
}
