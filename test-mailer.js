// Load environment variables from .env file
import 'dotenv/config';
// Simple SMTP test script using Nodemailer
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mailOptions = {
  from: process.env.SMTP_FROM || 'no-reply@elonbroker.com',
  to: process.env.SMTP_TEST_TO || 'yourtestemail@gmail.com', // Change to your test email
  subject: 'SMTP Test Email',
  text: 'This is a test email sent from your Nodemailer SMTP configuration.',
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('SMTP test failed:', error);
  } else {
    console.log('SMTP test successful! Message sent:', info.response);
  }
});
// test-mailer.js
import { sendPasswordResetEmail } from "./src/utils/mailer.js";

const testEmail = process.env.SMTP_USER || "Eloninprivateinvestment@outlook.com";
const testLink = "https://example.com/reset-password?token=TESTTOKEN123";

(async () => {
  try {
    const info = await sendPasswordResetEmail(testEmail, testLink);
    console.log("Email sent! Info:", info);
  } catch (err) {
    console.error("Failed to send test email:", err);
  }
})();
