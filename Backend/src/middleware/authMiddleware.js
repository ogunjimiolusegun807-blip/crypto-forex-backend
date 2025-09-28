const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt');
const { asyncHandler, createError } = require('./errorHandler');
const User = require('../models/User');

/**
 * Protect routes - require authentication
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return next(createError('Not authorized, no token provided', 401));
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(createError('Not authorized, user not found', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(createError('Account deactivated', 401));
    }

    // Check if user is verified
    if (!user.isVerified) {
      return next(createError('Please verify your email first', 401));
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    return next(createError('Not authorized, invalid token', 401));
  }
});

/**
 * Optional authentication - user info if token present
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = extractTokenFromHeader(authHeader);

  if (token) {
    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive && user.isVerified) {
        req.user = user;
      }
    } catch (error) {
      // Continue without user if token is invalid
    }
  }

  next();
});

/**
 * Require specific role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Not authorized, please login', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError(`Access denied. Required roles: ${roles.join(', ')}`, 403));
    }

    next();
  };
};

/**
 * Require admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Require user to own the resource or be admin
 */
const requireOwnership = (userIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Not authorized, please login', 401));
    }

    const resourceUserId = req.params[userIdField] || req.body[userIdField] || req.query[userIdField];
    
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // User can only access their own resources
    if (req.user._id.toString() !== resourceUserId) {
      return next(createError('Access denied. You can only access your own resources', 403));
    }

    next();
  };
};

/**
 * Check if account is verified
 */
const requireVerified = (req, res, next) => {
  if (!req.user) {
    return next(createError('Not authorized, please login', 401));
  }

  if (!req.user.isVerified) {
    return next(createError('Please verify your email first', 401));
  }

  next();
};

/**
 * Check if KYC is completed (for trading operations)
 */
const requireKYC = (req, res, next) => {
  if (!req.user) {
    return next(createError('Not authorized, please login', 401));
  }

  if (req.user.kycStatus !== 'approved') {
    return next(createError('KYC verification required for this operation', 403));
  }

  next();
};

/**
 * Rate limiting per user
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get user's request history
    let userRequests = requests.get(userId) || [];
    
    // Remove old requests outside the window
    userRequests = userRequests.filter(timestamp => timestamp > windowStart);

    if (userRequests.length >= maxRequests) {
      return next(createError('Rate limit exceeded for user', 429));
    }

    // Add current request
    userRequests.push(now);
    requests.set(userId, userRequests);

    next();
  };
};

module.exports = {
  protect,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireOwnership,
  requireVerified,
  requireKYC,
  userRateLimit
};