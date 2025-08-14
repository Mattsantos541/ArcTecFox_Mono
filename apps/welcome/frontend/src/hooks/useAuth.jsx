import { useState, useEffect, createContext, useContext } from 'react';
import { getCurrentUser, signIn, signOut, signUp, signInWithGoogle, getCurrentUserSession, supabase } from '../api';
import { useErrorHandler } from './useErrorHandler';

// Create Auth Context
const AuthContext = createContext({});

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { handleAsyncError } = useErrorHandler();

  // Check for existing auth session and listen for changes
  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth state changes (this handles OAuth redirects)
    // Only update state for significant auth events, not on every tab focus
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only handle significant auth events
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          console.log('Auth state changed:', event, session?.user?.email);
          
          if (mounted) {
            setUser(session?.user ?? null);
            setLoading(false);
            
            // Clear any error when successfully authenticated
            if (session?.user) {
              setError(null);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (error) {
      console.log('No active session:', error.message);
      setUser(null);
      setError(null);
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

  const loginWithGoogle = handleAsyncError(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await signInWithGoogle();
      // The onAuthStateChange listener will handle setting the user
      
      return { success: true };
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return { success: false, error: error.message };
    }
  });

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
    loginWithGoogle,
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
