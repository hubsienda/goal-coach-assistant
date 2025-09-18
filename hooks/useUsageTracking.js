// hooks/useUsageTracking.js
// tracks usage
import { useState, useEffect } from 'react';

export function useUsageTracking() {
  const [usage, setUsage] = useState({
    usage_count: 0,
    daily_goals_count: 0,
    subscription_status: 'free',
    trial_ends: null,
    email: null,
    userId: null
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load usage from API and localStorage on mount
  useEffect(() => {
    loadInitialUsage();
  }, []);

  const loadInitialUsage = async () => {
    try {
      // Check if user is authenticated (cookie-based)
      const userId = getCookie('goalverse_auth');
      
      if (userId) {
        // Authenticated user - fetch from database
        const response = await fetch(`/api/user/usage?userId=${userId}`);
        if (response.ok) {
          const serverUsage = await response.json();
          setUsage(prev => ({
            ...prev,
            ...serverUsage,
            userId
          }));
          setLoading(false);
          return;
        }
      }

      // Anonymous user - fetch IP-based limits
      const response = await fetch('/api/user/usage');
      if (response.ok) {
        const serverUsage = await response.json();
        setUsage(prev => ({
          ...prev,
          ...serverUsage
        }));
      } else {
        // Fallback to localStorage if API fails
        loadUsageFromStorage();
      }
    } catch (error) {
      console.error('Error loading usage:', error);
      // Fallback to localStorage
      loadUsageFromStorage();
    }
    
    setLoading(false);
  };

  const loadUsageFromStorage = () => {
    try {
      const storedUsage = localStorage.getItem('goalverse_usage');
      if (storedUsage) {
        const parsed = JSON.parse(storedUsage);
        
        // Reset daily count if it's a new day
        const lastReset = new Date(parsed.last_daily_reset || 0);
        const today = new Date();
        const isNewDay = lastReset.toDateString() !== today.toDateString();
        
        if (isNewDay) {
          parsed.daily_goals_count = 0;
          parsed.last_daily_reset = today.toISOString();
        }
        
        setUsage(prev => ({ ...prev, ...parsed }));
        saveUsageToStorage(parsed);
      }
    } catch (error) {
      console.error('Error loading usage from storage:', error);
    }
  };

  const saveUsageToStorage = (newUsage) => {
    try {
      localStorage.setItem('goalverse_usage', JSON.stringify(newUsage));
    } catch (error) {
      console.error('Error saving usage to storage:', error);
    }
  };

  const updateUsage = (updates) => {
    const newUsage = { ...usage, ...updates };
    setUsage(newUsage);
    saveUsageToStorage(newUsage);
  };

  const trackGoalCreation = async () => {
    try {
      // Call the API to check and increment usage
      const response = await fetch('/api/user/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: usage.userId,
          action: 'create_goal'
        })
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const result = await response.json();
      
      if (result.limit_reached) {
        setShowEmailModal(true);
        return false;
      }

      // Success - update local state to reflect the change
      if (usage.userId) {
        // Authenticated user - refresh from server
        await loadInitialUsage();
      } else {
        // Anonymous user - update local counters
        updateUsage({
          daily_goals_count: (usage.daily_goals_count || 0) + 1,
          last_daily_reset: new Date().toISOString()
        });
      }

      return true;
    } catch (error) {
      console.error('Goal creation tracking error:', error);
      
      // Fallback to local-only tracking
      if (usage.subscription_status === 'active') {
        return true;
      }

      if ((usage.daily_goals_count || 0) >= 10 || (usage.usage_count || 0) >= 3) {
        setShowEmailModal(true);
        return false;
      }

      // Update local counters as fallback
      updateUsage({
        usage_count: (usage.usage_count || 0) + 1,
        daily_goals_count: (usage.daily_goals_count || 0) + 1,
        last_daily_reset: new Date().toISOString()
      });

      return true;
    }
  };

  const handleEmailModalSubmit = async (email) => {
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }

      // Update local state with email
      updateUsage({ email });
      
      console.log('Magic link sent successfully');
    } catch (error) {
      console.error('Magic link error:', error);
      throw error; // Re-throw so the modal can handle the error
    }
  };

  // Helper function to get cookie value
  const getCookie = (name) => {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const upgradeToTrial = () => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    
    updateUsage({
      subscription_status: 'trial',
      trial_ends: trialEnd.toISOString()
    });
  };

  const upgradeToActive = () => {
    updateUsage({
      subscription_status: 'active',
      trial_ends: null
    });
  };

  const resetUsageLimits = () => {
    updateUsage({
      usage_count: 0,
      daily_goals_count: 0,
      last_daily_reset: new Date().toISOString()
    });
  };

  const logout = () => {
    // Clear auth cookie
    document.cookie = 'goalverse_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Reset to anonymous state
    setUsage({
      usage_count: 0,
      daily_goals_count: 0,
      subscription_status: 'free',
      trial_ends: null,
      email: null,
      userId: null
    });
    
    // Reload usage for anonymous user
    loadInitialUsage();
  };

  return {
    usage,
    loading,
    showEmailModal,
    setShowEmailModal,
    trackGoalCreation,
    handleEmailModalSubmit,
    upgradeToTrial,
    upgradeToActive,
    resetUsageLimits,
    updateUsage,
    logout
  };
}
