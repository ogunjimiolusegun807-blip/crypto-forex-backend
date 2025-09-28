# Crypto-Forex Backend API

Professional backend API for the Crypto-Forex trading platform built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication with refresh tokens
  - Role-based access control (User, Admin)
  - Email verification and password reset
  - Rate limiting and security middleware

- **User Management**
  - User registration and profile management
  - KYC (Know Your Customer) verification
  - Account settings and preferences
  - Balance and transaction history

- **Trading System**
  - Trade execution and history
  - Real-time market data integration
  - Transaction management
  - Portfolio tracking

- **Admin Panel Support**
  - User management and monitoring
  - Trade oversight and controls
  - System settings and configuration
  - Audit logging and reporting

- **Additional Features**
  - News feed management
  - Market calendar events
  - Subscription plans
  - File upload handling
  - Comprehensive logging

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠 Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/crypto-forex
   JWT_SECRET=your-super-secret-jwt-key
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   # ... other configurations
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🏗 Project Structure

```
backend/
├── src/
│   ├── controllers/          # Route controllers
│   ├── middleware/           # Custom middleware
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   ├── app.js              # Express app setup
│   ├── config.js           # Configuration
│   └── server.js           # Server entry point
├── tests/                   # Test files
├── logs/                    # Application logs
├── uploads/                 # File uploads
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `POST /api/auth/verify-email` - Email verification

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload-avatar` - Upload profile picture
- `GET /api/users/balance` - Get account balance
- `GET /api/users/transactions` - Get transaction history

### Trading
- `GET /api/trades` - Get user trades
- `POST /api/trades` - Create new trade
- `GET /api/trades/:id` - Get specific trade
- `PUT /api/trades/:id` - Update trade
- `DELETE /api/trades/:id` - Cancel trade

### Transactions
- `POST /api/transactions/deposit` - Create deposit
- `POST /api/transactions/withdraw` - Create withdrawal
- `GET /api/transactions/history` - Get transaction history

### KYC
- `POST /api/kyc/submit` - Submit KYC documents
- `GET /api/kyc/status` - Get KYC status
- `PUT /api/kyc/update` - Update KYC information

### News
- `GET /api/news` - Get news feed
- `GET /api/news/:id` - Get specific news item

### Calendar
- `GET /api/calendar/events` - Get calendar events
- `GET /api/calendar/events/:date` - Get events for specific date

### Plans
- `GET /api/plans` - Get subscription plans
- `POST /api/plans/subscribe` - Subscribe to plan

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/trades` - Get all trades
- `GET /api/admin/transactions` - Get all transactions
- `GET /api/admin/kyc/pending` - Get pending KYC applications
- `PUT /api/admin/kyc/:id/approve` - Approve KYC
- `PUT /api/admin/kyc/:id/reject` - Reject KYC

## 🔒 Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Configuration** for cross-origin requests
- **Helmet.js** for security headers
- **Request Logging** for audit trails
- **Role-based Access Control**

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/crypto-forex` |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `SMTP_HOST` | Email SMTP host | `smtp.gmail.com` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASS` | Email password | - |
| `FRONTEND_URL` | Frontend URL | `http://localhost:5173` |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📊 Logging

The application uses Winston for comprehensive logging:

- **Console Logging** - Development environment
- **File Logging** - All environments
- **Error Logging** - Separate error log file
- **Admin Action Logging** - Audit trail for admin actions

Logs are stored in the `logs/` directory:
- `combined.log` - All log levels
- `error.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   MONGODB_URI=your-production-mongodb-uri
   JWT_SECRET=your-secure-production-secret
   ```

2. **Process Manager (PM2)**
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name crypto-forex-api
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-api-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

## 📈 Monitoring

The API includes several monitoring endpoints:

- `GET /health` - Health check endpoint
- `GET /` - API information and available endpoints
- Built-in request logging and error tracking
- Performance metrics through middleware

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common issues

---

**Crypto-Forex Backend API** - Building the future of trading platforms 🚀