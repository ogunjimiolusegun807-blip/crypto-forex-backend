// Nodemailer setup for sending emails
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to, resetLink) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@elonbroker.com',
    to,
    subject: 'Password Reset Request',
    html: `<p>You requested a password reset. Click the link below to set a new password:</p>
           <p><a href="${resetLink}">${resetLink}</a></p>
           <p>If you did not request this, please ignore this email.</p>`
  };
  await transporter.sendMail(mailOptions);
}
