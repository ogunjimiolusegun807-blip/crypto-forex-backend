import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profileroutes.js';
import { sequelize } from './models/index.js';


const app = express();

const corsOptions = {
  origin: '*', // Allow all origins for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Manually set CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  next();
});
app.use(express.json());

// Debug: Log CORS headers for every response
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log('CORS headers:', {
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials'),
      'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': res.getHeader('Access-Control-Allow-Headers'),
    });
  });
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/user', profileRoutes);
// Also mount auth routes at /api so admin routes defined as '/admin/..' inside the auth router
// are reachable under /api/admin/.. which the frontend expects.
app.use('/api', authRoutes);

app.get('/', (req, res) => {
  res.send('Crypto Forex Backend API is running');
});

const PORT = process.env.PORT || 5000;
sequelize.sync()
  .then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database sync error:', err);
  });
