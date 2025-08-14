// State persistence utility to maintain app state across tab switches

const STATE_KEY = 'arctecfox_app_state';
const STATE_EXPIRY = 30 * 60 * 1000; // 30 minutes

/**
 * Save state to sessionStorage with timestamp
 * @param {string} key - The key for the specific state
 * @param {any} value - The value to store
 */
export const saveState = (key, value) => {
  try {
    const currentState = JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}');
    currentState[key] = {
      value,
      timestamp: Date.now()
    };
    sessionStorage.setItem(STATE_KEY, JSON.stringify(currentState));
  } catch (error) {
    console.warn('Failed to save state:', error);
  }
};

/**
 * Load state from sessionStorage
 * @param {string} key - The key for the specific state
 * @param {any} defaultValue - Default value if not found or expired
 * @returns {any} The stored value or default
 */
export const loadState = (key, defaultValue = null) => {
  try {
    const currentState = JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}');
    const item = currentState[key];
    
    if (!item) return defaultValue;
    
    // Check if state has expired
    if (Date.now() - item.timestamp > STATE_EXPIRY) {
      // Remove expired state
      delete currentState[key];
      sessionStorage.setItem(STATE_KEY, JSON.stringify(currentState));
      return defaultValue;
    }
    
    return item.value;
  } catch (error) {
    console.warn('Failed to load state:', error);
    return defaultValue;
  }
};

/**
 * Clear specific state or all state
 * @param {string} key - Optional key to clear specific state
 */
export const clearState = (key = null) => {
  try {
    if (key) {
      const currentState = JSON.parse(sessionStorage.getItem(STATE_KEY) || '{}');
      delete currentState[key];
      sessionStorage.setItem(STATE_KEY, JSON.stringify(currentState));
    } else {
      sessionStorage.removeItem(STATE_KEY);
    }
  } catch (error) {
    console.warn('Failed to clear state:', error);
  }
};

/**
 * Hook to persist component state
 * Note: This requires React to be imported where it's used
 * Example usage:
 * import React from 'react';
 * import { usePersistentState } from './statePersistence';
 * 
 * @param {string} key - Unique key for this state
 * @param {any} initialValue - Initial value
 * @returns {[any, function]} State value and setter
 */
export const usePersistentState = (key, initialValue) => {
  // This function needs React to be imported in the component using it
  // For now, we'll just export the utility functions above
  // Components can use loadState/saveState directly with useState
};