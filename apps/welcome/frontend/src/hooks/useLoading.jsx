import { useState, useCallback } from 'react';

// Hook for managing loading states
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const withLoading = useCallback(async (asyncFn) => {
    try {
      startLoading();
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading
  };
};

// Hook for managing multiple loading states
export const useLoadingStates = (initialStates = {}) => {
  const [loadingStates, setLoadingStates] = useState(initialStates);

  const setLoading = useCallback((key, value) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const startLoading = useCallback((key) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key) => {
    setLoading(key, false);
  }, [setLoading]);

  const withLoading = useCallback(async (key, asyncFn) => {
    try {
      startLoading(key);
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  const isLoading = useCallback((key) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  return {
    loadingStates,
    setLoading,
    startLoading,
    stopLoading,
    withLoading,
    isLoading,
    isAnyLoading
  };
};

// Hook for progressive loading states
export const useProgressiveLoading = (stages = []) => {
  const [currentStage, setCurrentStage] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStage(0);
  }, []);

  const nextStage = useCallback(() => {
    setCurrentStage(prev => Math.min(prev + 1, stages.length - 1));
  }, [stages.length]);

  const setStage = useCallback((stage) => {
    setCurrentStage(Math.max(0, Math.min(stage, stages.length - 1)));
  }, [stages.length]);

  const stop = useCallback(() => {
    setIsActive(false);
    setCurrentStage(0);
  }, []);

  const withProgressiveLoading = useCallback(async (asyncFn, stageCallbacks = []) => {
    try {
      start();
      
      const result = await asyncFn((stage) => {
        setStage(stage);
        if (stageCallbacks[stage]) {
          stageCallbacks[stage]();
        }
      });
      
      return result;
    } finally {
      stop();
    }
  }, [start, stop, setStage]);

  return {
    currentStage,
    isActive,
    currentStageText: stages[currentStage] || '',
    start,
    nextStage,
    setStage,
    stop,
    withProgressiveLoading
  };
};