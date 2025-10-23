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
