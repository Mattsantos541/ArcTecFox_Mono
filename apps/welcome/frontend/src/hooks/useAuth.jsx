import { useState, useEffect, createContext, useContext } from 'react';
import { getCurrentUser, signIn, signOut, signUp } from '../api';

// Create Auth Context
const AuthContext = createContext({});

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false); // Changed from true to false
  const [error, setError] = useState(null);

  // TEMPORARILY DISABLED - Remove this useEffect to stop infinite auth checks
  // useEffect(() => {
  //   checkUser();
  // }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (error) {
      console.log('No active session:', error.message);
      setUser(null);
      setError(null); // Don't treat missing auth as an error
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const loggedInUser = await signIn(email, password);
      
      setUser(loggedInUser);
      return { success: true, user: loggedInUser };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, userData = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const signupResult = await signUp(email, password);
      const newUser = signupResult.user;
      
      setUser(newUser);
      return { success: true, user: newUser };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      await signOut();
      
      setUser(null);
      setError(null);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    checkUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Export AuthContext for direct access if needed
export { AuthContext };