import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profileroutes.js';
import sequelize from './models/index.js';


const app = express();

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://crypto-forex-three.vercel.app',
    'https://crypto-forex-three-git-main-ogunjimiolusegun807-blip.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', profileRoutes);

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
