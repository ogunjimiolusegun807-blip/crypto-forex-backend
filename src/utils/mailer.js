// Nodemailer setup for sending emails
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Use SendGrid API when SENDGRID_API_KEY is present. Otherwise fall back to
// SMTP transporter (when configured) or a no-op logger. This avoids SMTP
// port issues on some PaaS providers while keeping the existing fallback.
const hasSendGrid = !!process.env.SENDGRID_API_KEY;
if (hasSendGrid) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.info('SendGrid API key detected - using SendGrid for outgoing mail');
}

// Normalize MAIL_FROM so SendGrid receives a proper RFC822 address.
function normalizeFrom(raw) {
  if (!raw) return raw;
  // If already contains angle brackets, assume valid
  if (/</.test(raw) && />/.test(raw)) return raw.trim();
  // If it's just an email, return as-is
  const emailOnlyMatch = raw.trim().match(/^<?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})>?$/i);
  if (emailOnlyMatch) return emailOnlyMatch[1];
  // If format is 'Name email@host' (no brackets), try to split last token as email
  const parts = raw.trim().split(/\s+/);
  const last = parts[parts.length - 1];
  if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(last)) {
    const name = parts.slice(0, -1).join(' ');
    return `${name} <${last}>`;
  }
  // Fallback: return raw trimmed
  return raw.trim();
}

const MAIL_FROM = normalizeFrom(process.env.MAIL_FROM || process.env.SMTP_FROM || 'no-reply@elonbroker.com');

const hasSMTP = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
let transporter = null;
if (hasSendGrid) {
  // create a thin wrapper with a sendMail method so existing callers work
  transporter = {
    sendMail: async (mailOptions) => {
      // sendgrid expects { to, from, subject, text/html }
      const msg = {
          to: mailOptions.to,
          from: MAIL_FROM || mailOptions.from,
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text,
        };
      console.info('Sending mail via SendGrid. Mail options:', JSON.stringify(msg, null, 2));
      const resp = await sgMail.send(msg);
      // sgMail.send returns an array of responses for legacy reasons
      return resp;
    }
  };
} else if (hasSMTP) {
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
    from: MAIL_FROM,
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
    console.info('SendMail response:', info && (Array.isArray(info) ? info[0] : info));
    // If neither SMTP nor SendGrid is configured, always log the reset link for dev testing
    if (!hasSMTP && !hasSendGrid) {
      console.info(`Password reset link for ${to}: ${resetLink}`);
    }
    return info;
  } catch (err) {
    console.error('Error sending password reset email:', err && (err.response ? err.response.body || err.response : err.message || err));
    console.error('Mail options at error:', JSON.stringify(mailOptions, null, 2));
    if (!hasSMTP && !hasSendGrid) {
      console.info(`Password reset link for ${to}: ${resetLink}`);
    }
    throw err;
  }
}
