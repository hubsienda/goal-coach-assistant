// hooks/useUsageTracking.js
import { useState, useEffect } from 'react';

export function useUsageTracking() {
  const [usage, setUsage] = useState({
    weekly_sessions_count: 0,   // Number of goal sessions created this week
    daily_sessions_count: 0,    // Number of goal sessions created today
    subscription_status: 'free', // 'free' or 'active' (no trial status)
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
            weekly_sessions_count: serverUsage.usage_count || 0,
            subscription_status: serverUsage.subscription_status || 'free',
            userId
          }));
          setLoading(false);
          return;
        }
      }

      // Anonymous user - load from localStorage and sync with IP-based API
      loadUsageFromStorage();
      
      // Also try to get server-side IP limits
      try {
        const response = await fetch('/api/user/usage');
        if (response.ok) {
          const serverUsage = await response.json();
          setUsage(prev => ({
            ...prev,
            daily_sessions_count: serverUsage.daily_goals_count || prev.daily_sessions_count,
            subscription_status: serverUsage.subscription_status || 'free'
          }));
        }
      } catch (error) {
        console.error('Error fetching IP usage:', error);
      }
    } catch (error) {
      console.error('Error loading usage:', error);
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
          parsed.daily_sessions_count = 0;
          parsed.last_daily_reset = today.toISOString();
        }

        // Reset weekly count if it's a new week (every Monday)
        const lastWeekReset = new Date(parsed.last_weekly_reset || 0);
        const isNewWeek = getWeekStart(today) > getWeekStart(lastWeekReset);
        
        if (isNewWeek) {
          parsed.weekly_sessions_count = 0;
          parsed.last_weekly_reset = today.toISOString();
        }
        
        setUsage(prev => ({ 
          ...prev, 
          weekly_sessions_count: parsed.weekly_sessions_count || 0,
          daily_sessions_count: parsed.daily_sessions_count || 0,
          email: parsed.email || null,
          subscription_status: parsed.subscription_status || 'free'
        }));
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
    
    // Also save to localStorage
    const storageData = {
      ...newUsage,
      last_daily_reset: new Date().toISOString(),
      last_weekly_reset: usage.last_weekly_reset || new Date().toISOString()
    };
    saveUsageToStorage(storageData);
  };

  const trackGoalCreation = async () => {
    console.log('🎯 Tracking goal creation:', { 
      currentWeekly: usage.weekly_sessions_count, 
      currentDaily: usage.daily_sessions_count, 
      subscription: usage.subscription_status 
    });

    // Premium users have unlimited sessions
    if (usage.subscription_status === 'active') {
      console.log('✅ Premium user - unlimited access');
      return true;
    }

    // Check FREE tier limits BEFORE creating
    if (usage.daily_sessions_count >= 10) {
      console.log('❌ Daily limit reached (10/day):', usage.daily_sessions_count);
      setShowEmailModal(true);
      return false;
    }

    if (usage.weekly_sessions_count >= 3) {
      console.log('❌ Weekly limit reached (3/week):', usage.weekly_sessions_count);
      setShowEmailModal(true);
      return false;
    }

    try {
      // Call API to track the goal creation
      const response = await fetch('/api/user/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: usage.userId,
          action: 'create_goal'
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.limit_reached) {
        console.log('❌ Server says limit reached');
        setShowEmailModal(true);
        return false;
      }

      // Success - increment local counters
      const today = new Date();
      updateUsage({
        weekly_sessions_count: usage.weekly_sessions_count + 1,
        daily_sessions_count: usage.daily_sessions_count + 1,
        last_daily_reset: today.toISOString(),
        last_weekly_reset: usage.last_weekly_reset || today.toISOString()
      });

      console.log('✅ Goal creation tracked successfully');
      return true;

    } catch (error) {
      console.error('❌ Goal creation API error:', error);
      
      // Fallback to local-only tracking
      if (usage.weekly_sessions_count >= 3 || usage.daily_sessions_count >= 10) {
        setShowEmailModal(true);
        return false;
      }

      // Update local counters as fallback
      const today = new Date();
      updateUsage({
        weekly_sessions_count: usage.weekly_sessions_count + 1,
        daily_sessions_count: usage.daily_sessions_count + 1,
        last_daily_reset: today.toISOString(),
        last_weekly_reset: usage.last_weekly_reset || today.toISOString()
      });

      return true;
    }
  };

  const handleEmailModalSubmit = async (email, plan = 'monthly') => {
    try {
      console.log('💳 Creating payment link for:', email, 'Plan:', plan);
      
      // Call Stripe checkout creation instead of magic link
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          plan,
          priceId: plan === 'annual' ? process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID : process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Stripe checkout API error:', response.status, errorText);
        throw new Error(`Failed to create payment link: ${response.status}`);
      }

      const result = await response.json();
      console.log('💳 Stripe checkout response:', result);

      // Update local state with email
      updateUsage({ email });
      
      console.log('✅ Payment link sent successfully');
    } catch (error) {
      console.error('❌ Payment link error:', error);
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

  // Helper function to get start of week (Monday)
  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const upgradeToActive = () => {
    updateUsage({
      subscription_status: 'active'
    });
  };

  const resetUsageLimits = () => {
    const today = new Date();
    updateUsage({
      weekly_sessions_count: 0,
      daily_sessions_count: 0,
      last_daily_reset: today.toISOString(),
      last_weekly_reset: today.toISOString()
    });
  };

  const logout = () => {
    // Clear auth cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'goalverse_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    
    // Reset to anonymous state
    setUsage({
      weekly_sessions_count: 0,
      daily_sessions_count: 0,
      subscription_status: 'free',
      email: null,
      userId: null
    });
    
    // Clear localStorage
    localStorage.removeItem('goalverse_usage');
    
    // Reload usage for anonymous user
    loadInitialUsage();
  };

  // Computed values for display (backwards compatibility)
  const displayUsage = {
    usage_count: usage.weekly_sessions_count,     // For backwards compatibility
    daily_goals_count: usage.daily_sessions_count,
    subscription_status: usage.subscription_status,
    email: usage.email,
    userId: usage.userId
  };

  return {
    usage: displayUsage,
    loading,
    showEmailModal,
    setShowEmailModal,
    trackGoalCreation,
    handleEmailModalSubmit,
    upgradeToActive,
    resetUsageLimits,
    updateUsage,
    logout
  };
}
