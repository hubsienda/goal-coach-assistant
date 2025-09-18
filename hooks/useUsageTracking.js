// hooks/useUsageTracking.js
import { useState, useEffect } from 'react';

export function useUsageTracking() {
  const [usage, setUsage] = useState({
    usage_count: 0,
    daily_goals_count: 0,
    subscription_status: 'free',
    trial_ends: null,
    email: null
  });
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Load usage from localStorage on mount
  useEffect(() => {
    loadUsageFromStorage();
  }, []);

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
        
        setUsage(parsed);
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
    // Check if user is premium
    if (usage.subscription_status === 'active') {
      return true; // No limits for premium users
    }

    // Check daily limits (free users: 10 per day)
    if (usage.daily_goals_count >= 10) {
      setShowEmailModal(true);
      return false;
    }

    // Check weekly limits (free users: 3 per week)
    if (usage.usage_count >= 3) {
      setShowEmailModal(true);
      return false;
    }

    // Increment counters
    const today = new Date();
    updateUsage({
      usage_count: usage.usage_count + 1,
      daily_goals_count: usage.daily_goals_count + 1,
      last_daily_reset: today.toISOString()
    });

    // Try to sync with backend (will fail gracefully if not implemented)
    try {
      await fetch('/api/user/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'increment_goal_creation',
          user_email: usage.email 
        })
      });
    } catch (error) {
      // Backend not implemented yet, continue with localStorage only
      console.log('Backend usage tracking not available yet');
    }

    return true;
  };

  const handleEmailModalSubmit = async (email) => {
    // Update local state
    updateUsage({ email });

    // Try to create user and send magic link
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        throw new Error('Failed to send magic link');
      }

      // Email sent successfully
      console.log('Magic link sent successfully');
    } catch (error) {
      console.error('Magic link error:', error);
      // For now, just close the modal even if backend fails
      // In production, you'd want to show an error message
    }
  };

  const upgradeToTrial = () => {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial
    
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

  return {
    usage,
    showEmailModal,
    setShowEmailModal,
    trackGoalCreation,
    handleEmailModalSubmit,
    upgradeToTrial,
    upgradeToActive,
    resetUsageLimits,
    updateUsage
  };
}
