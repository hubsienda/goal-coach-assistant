import { useState, useEffect } from 'react';

export function useUsageTracking() {
  const [usage, setUsage] = useState({
    subscription_status: 'free',
    usage_count: 0,
    daily_goals_count: 0,
    can_create_goal: true
  });
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    // Check if it's day 5 and show email modal
    const firstVisit = localStorage.getItem('goalverse_first_visit');
    if (!firstVisit) {
      localStorage.setItem('goalverse_first_visit', new Date().toISOString());
    } else {
      const daysSinceFirst = Math.floor((new Date() - new Date(firstVisit)) / (1000 * 60 * 60 * 24));
      const hasShownEmailModal = localStorage.getItem('goalverse_email_modal_shown');
      
      if (daysSinceFirst >= 5 && !hasShownEmailModal) {
        setShowEmailModal(true);
      }
    }

    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await fetch('/api/user/usage');
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  };

  const trackGoalCreation = async () => {
    try {
      const response = await fetch('/api/user/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_goal' })
      });

      const result = await response.json();
      if (result.limit_reached) {
        setShowEmailModal(true);
        return false;
      }

      loadUsage();
      return true;
    } catch (error) {
      console.error('Failed to track goal creation:', error);
      return true;
    }
  };

  const handleEmailModalSubmit = () => {
    localStorage.setItem('goalverse_email_modal_shown', 'true');
    setShowEmailModal(false);
  };

  return {
    usage,
    showEmailModal,
    setShowEmailModal,
    trackGoalCreation,
    handleEmailModalSubmit
  };
}
