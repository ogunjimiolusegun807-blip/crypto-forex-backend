const { asyncHandler, createError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Log admin actions for audit trail
 */
const logAdminAction = asyncHandler(async (req, res, next) => {
  // Store original send function
  const originalSend = res.send;
  
  // Override send function to log after response
  res.send = function(data) {
    // Log the admin action
    logger.info('Admin Action', {
      adminId: req.user?._id,
      adminEmail: req.user?.email,
      action: `${req.method} ${req.originalUrl}`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.method !== 'GET' ? req.body : undefined,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      params: Object.keys(req.params).length > 0 ? req.params : undefined,
      statusCode: res.statusCode,
      timestamp: new Date().toISOString()
    });
    
    // Call original send function
    originalSend.call(this, data);
  };

  next();
});

/**
 * Require admin role with enhanced security
 */
const requireAdminWithSecurity = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(createError('Authentication required', 401));
  }

  if (req.user.role !== 'admin') {
    // Log unauthorized admin access attempt
    logger.warn('Unauthorized admin access attempt', {
      userId: req.user._id,
      email: req.user.email,
      ip: req.ip,
      action: `${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString()
    });
    
    return next(createError('Admin access required', 403));
  }

  // Check if admin account is active
  if (!req.user.isActive) {
    return next(createError('Admin account deactivated', 403));
  }

  // Additional security checks for sensitive operations
  const sensitiveActions = [
    '/api/admin/users/delete',
    '/api/admin/users/ban',
    '/api/admin/system/settings',
    '/api/admin/database'
  ];

  const isSensitiveAction = sensitiveActions.some(action => 
    req.originalUrl.includes(action)
  );

  if (isSensitiveAction) {
    // Require recent login for sensitive actions (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (req.user.lastLogin && req.user.lastLogin < thirtyMinutesAgo) {
      return next(createError('Recent authentication required for this action', 401));
    }
  }

  next();
});

/**
 * Validate admin permissions for specific resources
 */
const validateAdminPermissions = (requiredPermissions = []) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return next(createError('Admin access required', 403));
    }

    // If no specific permissions required, allow all admins
    if (requiredPermissions.length === 0) {
      return next();
    }

    // Check if admin has required permissions
    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Admin permission denied', {
        adminId: req.user._id,
        adminEmail: req.user.email,
        requiredPermissions,
        userPermissions,
        action: `${req.method} ${req.originalUrl}`,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      return next(createError(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`, 
        403
      ));
    }

    next();
  });
};

/**
 * Require super admin role (for critical system operations)
 */
const requireSuperAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(createError('Authentication required', 401));
  }

  if (req.user.role !== 'admin' || !req.user.isSuperAdmin) {
    logger.warn('Unauthorized super admin access attempt', {
      userId: req.user._id,
      email: req.user.email,
      role: req.user.role,
      isSuperAdmin: req.user.isSuperAdmin,
      ip: req.ip,
      action: `${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString()
    });

    return next(createError('Super admin access required', 403));
  }

  next();
});

/**
 * Admin activity tracking middleware
 */
const trackAdminActivity = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    // Update admin's last activity
    req.user.lastActivity = new Date();
    await req.user.save({ validateBeforeSave: false });
  }
  
  next();
});

/**
 * Admin IP whitelist check
 */
const checkAdminIPWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    if (whitelist.length === 0) {
      return next(); // No IP restrictions
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!whitelist.includes(clientIP)) {
      logger.warn('Admin access from non-whitelisted IP', {
        ip: clientIP,
        adminEmail: req.user?.email,
        action: `${req.method} ${req.originalUrl}`,
        timestamp: new Date().toISOString()
      });

      return next(createError('Access denied from this IP address', 403));
    }

    next();
  };
};

module.exports = {
  logAdminAction,
  requireAdminWithSecurity,
  validateAdminPermissions,
  requireSuperAdmin,
  trackAdminActivity,
  checkAdminIPWhitelist
};