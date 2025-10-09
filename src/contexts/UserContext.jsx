import React, { createContext, useContext, useState, useEffect } from 'react';
import { userAPI } from '../services/api';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Check if user is authenticated based on stored token
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('authToken');
    }
    return false;
  });

  useEffect(() => {
    checkBackendStatus();
    if (isAuthenticated) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const checkBackendStatus = async () => {
    // No backend health check in frontend-only mode
    setBackendStatus('fallback');
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setUser(null);
        setUserStats(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      const profileResponse = await userAPI.getProfile(token);
      if (profileResponse && profileResponse.username) {
        setUser(profileResponse);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(profileResponse));
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setError(profileResponse.error || 'Failed to load user profile');
      }
      // Optionally, set userStats if your backend provides stats
    } catch (err) {
      setError(err.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData) => {
    try {
      const response = await userAPI.updateProfile(userData);
      const updatedUser = response.success ? response.data.user : response;
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const refreshStats = () => {
    return loadUserData();
  };

  const login = async (credentials) => {
    try {
      setError(null);
      const response = await userAPI.login(credentials);
      
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        await loadUserData(); // Load complete user data after login
        return response.data.user;
      } else {
        // Handle fallback response
        setUser(response);
        setIsAuthenticated(true);
        return response;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = () => {
    // Remove token from localStorage in frontend-only mode
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
    setUser(null);
    setUserStats(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const value = {
    user,
    userStats,
    loading,
    error,
    isAuthenticated,
    backendStatus,
    updateUser,
    refreshStats,
    login,
    logout,
    checkBackendStatus,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
