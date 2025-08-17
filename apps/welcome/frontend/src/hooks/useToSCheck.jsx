import { useState, useEffect } from 'react';
import { supabase } from '../api';

// Terms of Service last updated date - update this when ToS changes
const TERMS_LAST_UPDATED = '2025-07-22T00:00:00Z';

export const useToSCheck = (user) => {
  const [needsToSAcceptance, setNeedsToSAcceptance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userToSStatus, setUserToSStatus] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setNeedsToSAcceptance(false);
      return;
    }

    const checkToSStatus = async () => {
      try {
        const startTime = performance.now();
        setLoading(true);
        
        // Check user's ToS confirmation status with timeout for faster UX
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ToS check timeout')), 3000)
        );
        
        const dataPromise = supabase
          .from('users')
          .select('confirmed_ToS')
          .eq('id', user.id)
          .single();
        
        const { data: userData, error } = await Promise.race([dataPromise, timeoutPromise]);
        const endTime = performance.now();

        if (error) {
          console.error('Error checking ToS status:', error);
          // If there's an error, we'll assume they need to accept
          setNeedsToSAcceptance(true);
          return;
        }

        setUserToSStatus(userData);

        // Check if user needs to accept/re-accept ToS
        const needsAcceptance = !userData.confirmed_ToS || 
          new Date(userData.confirmed_ToS) < new Date(TERMS_LAST_UPDATED);

        setNeedsToSAcceptance(needsAcceptance);
        
        // Only log if ToS acceptance is needed or check is slow
        if (needsAcceptance || (endTime - startTime) > 1000) {
          console.log('✅ ToS: Check complete:', {
            needsAcceptance,
            duration: Math.round(endTime - startTime) + 'ms'
          });
        }

      } catch (error) {
        console.error('Error in ToS check:', error);
        setNeedsToSAcceptance(true);
      } finally {
        setLoading(false);
      }
    };

    checkToSStatus();
  }, [user?.id]);

  const markToSAsAccepted = () => {
    setNeedsToSAcceptance(false);
  };

  return {
    needsToSAcceptance,
    loading,
    userToSStatus,
    markToSAsAccepted
  };
};