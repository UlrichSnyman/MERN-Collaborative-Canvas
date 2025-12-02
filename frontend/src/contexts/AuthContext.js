import React, { createContext, useContext, useState, useEffect } from 'react';
import { gql, useQuery } from '@apollo/client';

const GET_ME = gql`
  query GetMe {
    me {
      id
      username
      lastPixelPlacementTimestamp
      pixelCount
      isAdmin
    }
  }
`;

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Query to get current user data
  const { refetch: refetchMe } = useQuery(GET_ME, {
    skip: !token,
    onCompleted: (data) => {
      if (data?.me) {
        setUser(data.me);
        localStorage.setItem('user', JSON.stringify(data.me));
      }
    },
    onError: (error) => {
      console.error('Error fetching current user:', error);
      // If token is invalid, logout
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        logout();
      }
    }
  });

  useEffect(() => {
    // Check for stored token on app start
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('user');
        }
      }
    }
    
    setIsInitialized(true);
  }, []);

  // When token changes, refetch user data
  useEffect(() => {
    if (token && isInitialized) {
      refetchMe();
    }
  }, [token, isInitialized, refetchMe]);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const updateUser = (updatedUser) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};