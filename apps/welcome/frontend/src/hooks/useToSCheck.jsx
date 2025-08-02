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
        setLoading(true);
        
        // Check user's ToS confirmation status
        const { data: userData, error } = await supabase
          .from('users')
          .select('confirmed_ToS')
          .eq('id', user.id)
          .single();

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
        
        console.log('ToS Check:', {
          userConfirmedAt: userData.confirmed_ToS,
          termsLastUpdated: TERMS_LAST_UPDATED,
          needsAcceptance
        });

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