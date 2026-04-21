'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const setToken = (newToken) => {
    console.log('Setting token:', newToken ? 'token received' : 'no token');
    localStorage.setItem('access_token', newToken);
    setTokenState(newToken);
  };

  const clearTokens = () => {
    console.log('Clearing tokens');
    localStorage.removeItem('access_token');
    setTokenState(null);
    setUser(null);
  };

  const checkAuth = async () => {
    try {
      const storedToken = localStorage.getItem('access_token');
      console.log('Checking auth, stored token:', storedToken ? 'exists' : 'none');
      
      if (storedToken) {
        setTokenState(storedToken);
        const userData = await fetchWithAuth('/auth/me');
        setUser(userData);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const fetchWithAuth = async (endpoint, options = {}) => {
    const currentToken = token || localStorage.getItem('access_token');
    
    if (!currentToken) {
      console.error('No token found for request to:', endpoint);
      throw new Error('No token found');
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
          ...options.headers,
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token expired, clearing');
          clearTokens();
          throw new Error('Session expired');
        }
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw error;
      }

      return response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Login attempt for:', email);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw error;
      }
      
      const data = await response.json();
      console.log('Login response:', data);
      
      if (data.access_token) {
        setToken(data.access_token);
        
        // Fetch user data
        try {
          const userData = await fetchWithAuth('/auth/me');
          setUser(userData);
          toast.success('Login successful!');
          router.push('/dashboard');
          return { success: true, data };
        } catch (userError) {
          console.error('Failed to fetch user data:', userError);
          toast.success('Login successful!');
          router.push('/dashboard');
          return { success: true, data };
        }
      }
      
      throw new Error('No access token received');
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.detail || error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
        throw error;
      }
      
      const data = await response.json();
      toast.success('Registration successful! Please login.');
      router.push('/login');
      return data;
    } catch (error) {
      toast.error(error.detail || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    clearTokens();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    checkAuth,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}