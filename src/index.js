import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profileroutes.js';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://crypto-forex-three.vercel.app',
    'https://crypto-forex-three-git-main-ogunjimiolusegun807-blip.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', profileRoutes);

app.get('/', (req, res) => {
  res.send('Crypto Forex Backend API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
