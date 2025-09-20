// hooks/useNotifications.js - Smart Notifications Integration Hook
import { useState, useEffect, useCallback } from 'react';

export function useNotifications(userId) {
  const [preferences, setPreferences] = useState(null);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load notification preferences and data
  const loadNotificationData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/notifications/manage?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setScheduledNotifications(data.scheduledNotifications);
        setNotificationHistory(data.notificationHistory);
      } else {
        console.error('Failed to load notification data');
        // Set default preferences if loading fails
        setPreferences(getDefaultPreferences());
      }
    } catch (error) {
      console.error('Error loading notification data:', error);
      setPreferences(getDefaultPreferences());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Update notification preferences
  const updatePreferences = async (newPreferences, schedulePreferences = null) => {
    if (!userId) return false;

    try {
      setUpdating(true);
      
      const response = await fetch('/api/notifications/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          preferences: newPreferences,
          schedulePreferences
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        
        // Reload notification data to get updated schedule
        await loadNotificationData();
        
        return true;
      } else {
        console.error('Failed to update preferences');
        return false;
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  // Trigger smart notification analysis
  const triggerSmartNotifications = async () => {
    if (!userId) return false;

    try {
      const response = await fetch('/api/notifications/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          triggerType: 'smart_analysis'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Reload notification data to see new scheduled notifications
        await loadNotificationData();
        
        return {
          success: true,
          scheduledCount: data.scheduledNotifications?.length || 0,
          message: data.message
        };
      } else {
        return {
          success: false,
          error: 'Failed to trigger notifications'
        };
      }
    } catch (error) {
      console.error('Error triggering notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Schedule a custom notification
  const scheduleCustomNotification = async (notificationType, scheduledFor, data = {}) => {
    if (!userId) return false;

    try {
      const response = await fetch('/api/notifications/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          notificationType,
          scheduledFor,
          data,
          recurring: false
        })
      });

      if (response.ok) {
        // Reload notification data to see the new scheduled notification
        await loadNotificationData();
        return true;
      } else {
        console.error('Failed to schedule notification');
        return false;
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return false;
    }
  };

  // Get notification statistics
  const getNotificationStats = () => {
    if (!notificationHistory || notificationHistory.length === 0) {
      return {
        totalSent: 0,
        openRate: 0,
        clickRate: 0,
        lastSent: null,
        mostEngagedType: null
      };
    }

    const sentNotifications = notificationHistory.filter(n => n.status === 'sent');
    const openedNotifications = notificationHistory.filter(n => n.opened_at);
    const clickedNotifications = notificationHistory.filter(n => n.clicked_at);

    // Calculate engagement by notification type
    const typeEngagement = {};
    notificationHistory.forEach(notification => {
      const type = notification.notification_type;
      if (!typeEngagement[type]) {
        typeEngagement[type] = { sent: 0, opened: 0, clicked: 0 };
      }
      
      if (notification.status === 'sent') typeEngagement[type].sent++;
      if (notification.opened_at) typeEngagement[type].opened++;
      if (notification.clicked_at) typeEngagement[type].clicked++;
    });

    // Find most engaged notification type
    let mostEngagedType = null;
    let highestEngagement = 0;
    
    Object.entries(typeEngagement).forEach(([type, stats]) => {
      if (stats.sent > 0) {
        const engagementRate = (stats.opened + stats.clicked) / stats.sent;
        if (engagementRate > highestEngagement) {
          highestEngagement = engagementRate;
          mostEngagedType = type;
        }
      }
    });

    return {
      totalSent: sentNotifications.length,
      openRate: sentNotifications.length > 0 ? 
        Math.round((openedNotifications.length / sentNotifications.length) * 100) : 0,
      clickRate: openedNotifications.length > 0 ? 
        Math.round((clickedNotifications.length / openedNotifications.length) * 100) : 0,
      lastSent: sentNotifications.length > 0 ? 
        sentNotifications[0].sent_at : null,
      mostEngagedType,
      typeEngagement
    };
  };

  // Get upcoming notifications
  const getUpcomingNotifications = () => {
    if (!scheduledNotifications) return [];
    
    const now = new Date();
    return scheduledNotifications
      .filter(notification => 
        notification.status === 'pending' && 
        new Date(notification.scheduled_for) > now
      )
      .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
      .slice(0, 5); // Next 5 notifications
  };

  // Check if user has specific notification enabled
  const isNotificationEnabled = (notificationType) => {
    if (!preferences) return false;
    return preferences[notificationType] === true;
  };

  // Get notification frequency setting
  const getNotificationFrequency = () => {
    return preferences?.reminder_frequency || 'smart';
  };

  // Quick toggle for notification types
  const toggleNotification = async (notificationType) => {
    if (!preferences) return false;
    
    const newPreferences = {
      ...preferences,
      [notificationType]: !preferences[notificationType]
    };
    
    return await updatePreferences(newPreferences);
  };

  // Load data on mount and when userId changes
  useEffect(() => {
    loadNotificationData();
  }, [loadNotificationData]);

  return {
    // State
    preferences,
    scheduledNotifications,
    notificationHistory,
    loading,
    updating,
    
    // Actions
    updatePreferences,
    triggerSmartNotifications,
    scheduleCustomNotification,
    toggleNotification,
    loadNotificationData,
    
    // Computed values
    getNotificationStats,
    getUpcomingNotifications,
    isNotificationEnabled,
    getNotificationFrequency,
    
    // Helper values
    hasNotifications: scheduledNotifications.length > 0,
    notificationStats: getNotificationStats(),
    upcomingNotifications: getUpcomingNotifications()
  };
}

/**
 * Hook for tracking notification interactions (opens, clicks)
 */
export function useNotificationTracking() {
  const trackNotificationOpen = async (notificationId, userId) => {
    try {
      await fetch('/api/notifications/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          userId,
          action: 'open'
        })
      });
    } catch (error) {
      console.error('Error tracking notification open:', error);
    }
  };

  const trackNotificationClick = async (notificationId, userId, linkUrl = null) => {
    try {
      await fetch('/api/notifications/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationId,
          userId,
          action: 'click',
          metadata: { linkUrl }
        })
      });
    } catch (error) {
      console.error('Error tracking notification click:', error);
    }
  };

  return {
    trackNotificationOpen,
    trackNotificationClick
  };
}

/**
 * Hook for automatic notification triggers based on user behavior
 */
export function useNotificationTriggers(userId, userActivity) {
  const [lastTriggerCheck, setLastTriggerCheck] = useState(null);

  // Check if we should trigger any notifications based on user activity
  const checkForTriggers = useCallback(async () => {
    if (!userId || !userActivity) return;

    const now = new Date();
    const lastCheck = lastTriggerCheck ? new Date(lastTriggerCheck) : new Date(0);
    
    // Only check once per hour to avoid spam
    if (now - lastCheck < 60 * 60 * 1000) return;

    try {
      // Trigger smart notification analysis
      const response = await fetch('/api/notifications/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          triggerType: 'activity_based'
        })
      });

      if (response.ok) {
        setLastTriggerCheck(now.toISOString());
      }
    } catch (error) {
      console.error('Error checking notification triggers:', error);
    }
  }, [userId, userActivity, lastTriggerCheck]);

  // Check for triggers when user activity changes
  useEffect(() => {
    checkForTriggers();
  }, [checkForTriggers]);

  return {
    checkForTriggers,
    lastTriggerCheck
  };
}

// Default notification preferences
function getDefaultPreferences() {
  return {
    weekly_summary: true,
    progress_checkin: true,
    streak_celebration: true,
    goal_completion: true,
    inactivity_reminder: true,
    email_notifications: true,
    reminder_frequency: 'smart',
    preferred_time: '09:00',
    timezone: 'UTC'
  };
}

export default useNotifications;
