const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/crypto-forex',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/crypto-forex-test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Email
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    },
    from: {
      email: process.env.FROM_EMAIL || 'noreply@crypto-forex.com',
      name: process.env.FROM_NAME || 'Crypto-Forex Platform'
    }
  },

  // Frontend
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173'
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@crypto-forex.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    path: process.env.UPLOAD_PATH || 'uploads/'
  },

  // External APIs
  externalApis: {
    cryptoApiKey: process.env.CRYPTO_API_KEY,
    forexApiKey: process.env.FOREX_API_KEY,
    newsApiKey: process.env.NEWS_API_KEY
  }
};