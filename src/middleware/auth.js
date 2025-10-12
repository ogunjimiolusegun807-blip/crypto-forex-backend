import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = decoded;
    // backward-compat: set userId directly for routes that expect req.userId
    if (decoded && decoded.userId) req.userId = decoded.userId;
    next();
  });
}

export function requireAdmin(req, res, next) {
  // authenticateToken should have set req.user
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Authorization header missing.' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' });
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

export default { authenticateToken, requireAdmin };
