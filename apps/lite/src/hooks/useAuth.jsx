
import { useState, useEffect, createContext, useContext } from 'react';
import { getCurrentUser, signIn, signUp, signOut } from '../api';

// Create context
const AuthContext = createContext(null);

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Authentication check failed:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const user = await signIn(email, password);
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Signup function
  const register = async (email, password) => {
    try {
      const user = await signUp(email, password);
      setUser(user);
      return user;
    } catch (error) {
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  // Provide auth context
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for components to get auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
