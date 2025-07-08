import { useState, useEffect } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      console.error('Unhandled error:', error);
      setError(error);
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setError(new Error(`Unhandled promise rejection: ${event.reason}`));
    };

    // Listen for unhandled errors
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const resetError = () => {
    setError(null);
  };

  const handleAsyncError = (asyncFn) => {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        console.error('Async error caught:', error);
        setError(error);
        throw error; // Re-throw to allow caller to handle if needed
      }
    };
  };

  return { error, resetError, handleAsyncError };
};

// Hook to safely handle async operations
export const useAsyncError = () => {
  const [error, setError] = useState(null);

  const executeAsync = async (asyncFn, errorMessage = 'An error occurred') => {
    try {
      setError(null);
      return await asyncFn();
    } catch (err) {
      console.error('Async operation failed:', err);
      setError(err.message || errorMessage);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return { error, executeAsync, clearError };
};