// Simple test harness for the application's mailer. It will use SendGrid
// when SENDGRID_API_KEY is present, otherwise it will use the SMTP/no-op
// fallback implemented in `src/utils/mailer.js`.
import 'dotenv/config';
import { sendPasswordResetEmail } from './src/utils/mailer.js';

const testEmail = process.env.SMTP_TEST_TO || process.env.SMTP_USER || 'yourtestemail@example.com';
const testLink = 'https://example.com/reset-password?token=TESTTOKEN123';

(async () => {
  try {
    console.log('Running mailer test. testEmail:', testEmail);
    const info = await sendPasswordResetEmail(testEmail, testLink);
    console.log('Mailer test completed. Info:', info);
  } catch (err) {
    console.error('Mailer test failed:', err && (err.response ? err.response.body || err.response : err));
    process.exitCode = 1;
  }
})();
