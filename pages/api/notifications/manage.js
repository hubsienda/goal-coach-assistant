// pages/api/notifications/manage.js - Notification Management & User Preferences
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGetPreferences(req, res);
  } else if (req.method === 'POST') {
    return handleUpdatePreferences(req, res);
  } else if (req.method === 'PUT') {
    return handleTriggerNotifications(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Get user notification preferences and scheduled notifications
 */
async function handleGetPreferences(req, res) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('notification_preferences, email, subscription_status')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user preferences' });
    }

    // Get scheduled notifications
    const { data: scheduledNotifications, error: notificationsError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return res.status(500).json({ error: 'Failed to fetch scheduled notifications' });
    }

    // Get notification history
    const { data: notificationHistory, error: historyError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Error fetching notification history:', historyError);
    }

    const preferences = user.notification_preferences || getDefaultPreferences();

    res.status(200).json({
      success: true,
      preferences,
      scheduledNotifications: scheduledNotifications || [],
      notificationHistory: notificationHistory || [],
      email: user.email,
      subscriptionStatus: user.subscription_status
    });

  } catch (error) {
    console.error('Error in handleGetPreferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Update user notification preferences
 */
async function handleUpdatePreferences(req, res) {
  try {
    const { userId, preferences, schedulePreferences } = req.body;

    if (!userId || !preferences) {
      return res.status(400).json({ error: 'User ID and preferences are required' });
    }

    // Validate preferences structure
    const validatedPreferences = validatePreferences(preferences);

    // Update user preferences
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        notification_preferences: validatedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }

    // Handle schedule preferences if provided
    if (schedulePreferences) {
      await updateScheduledNotifications(userId, schedulePreferences);
    }

    // Log preference change
    await supabase
      .from('notification_logs')
      .insert([
        {
          user_id: userId,
          notification_type: 'preferences_updated',
          status: 'info',
          sent_at: new Date().toISOString()
        }
      ]);

    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: validatedPreferences
    });

  } catch (error) {
    console.error('Error in handleUpdatePreferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Trigger smart notifications for a user (manual or automated)
 */
async function handleTriggerNotifications(req, res) {
  try {
    const { userId, triggerType = 'smart_analysis' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user data and analyze notification needs
    const notificationPlan = await analyzeUserForNotifications(userId);

    const scheduledNotifications = [];

    // Schedule notifications based on analysis
    for (const notification of notificationPlan) {
      const { data: scheduled, error } = await supabase
        .from('scheduled_notifications')
        .insert([notification])
        .select()
        .single();

      if (!error) {
        scheduledNotifications.push(scheduled);
      }
    }

    res.status(200).json({
      success: true,
      message: `${scheduledNotifications.length} notifications scheduled`,
      scheduledNotifications,
      triggerType
    });

  } catch (error) {
    console.error('Error in handleTriggerNotifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Analyze user data to determine what notifications to schedule
 */
async function analyzeUserForNotifications(userId) {
  const notifications = [];
  
  try {
    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('*, notification_preferences')
      .eq('id', userId)
      .single();

    if (!user) return notifications;

    const preferences = user.notification_preferences || getDefaultPreferences();
    
    // Get user activity data
    const { data: recentActivity } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    const { data: goals } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: analytics } = await supabase
      .from('user_analytics_summary')
      .select('*')
      .eq('user_id', userId)
      .single();

    const now = new Date();
    const lastActivity = recentActivity?.[0]?.created_at;
    const daysSinceActivity = lastActivity ? 
      Math.floor((now - new Date(lastActivity)) / (1000 * 60 * 60 * 24)) : 365;

    // 1. Weekly Summary (Sundays at 9 AM for premium users)
    if (preferences.weekly_summary && user.subscription_status === 'active') {
      const nextSunday = getNextSunday(9, 0); // 9 AM
      notifications.push({
        user_id: userId,
        notification_type: 'weekly_summary',
        scheduled_for: nextSunday.toISOString(),
        data: {
          completedThisWeek: analytics?.completed_goals || 0,
          currentStreak: analytics?.current_streak || 0
        },
        recurring: true,
        recurring_pattern: 'weekly',
        status: 'pending',
        created_at: now.toISOString()
      });
    }

    // 2. Progress Check-in (based on activity patterns)
    if (preferences.progress_checkin) {
      let checkInTime;
      
      if (daysSinceActivity >= 3 && daysSinceActivity <= 7) {
        // Schedule for tomorrow morning
        checkInTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        checkInTime.setHours(10, 0, 0, 0);
      } else if (daysSinceActivity > 7) {
        // Schedule for this evening
        checkInTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      }

      if (checkInTime) {
        notifications.push({
          user_id: userId,
          notification_type: 'progress_checkin',
          scheduled_for: checkInTime.toISOString(),
          data: {
            lastActivity: lastActivity,
            daysSinceActivity: daysSinceActivity
          },
          recurring: false,
          status: 'pending',
          created_at: now.toISOString()
        });
      }
    }

    // 3. Streak Celebration
    if (preferences.streak_celebration && analytics?.current_streak) {
      const streak = analytics.current_streak;
      if ([7, 14, 30, 60, 90, 180, 365].includes(streak)) {
        const celebrationTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
        
        notifications.push({
          user_id: userId,
          notification_type: 'streak_celebration',
          scheduled_for: celebrationTime.toISOString(),
          data: {
            currentStreak: streak,
            milestone: getStreakMilestone(streak),
            achievements: getStreakAchievements(streak)
          },
          recurring: false,
          status: 'pending',
          created_at: now.toISOString()
        });
      }
    }

    // 4. Goal Completion Celebration
    if (preferences.goal_completion) {
      const recentCompletions = goals?.filter(goal => 
        goal.status === 'completed' && 
        new Date(goal.updated_at) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
      );

      for (const goal of recentCompletions || []) {
        notifications.push({
          user_id: userId,
          notification_type: 'goal_completion',
          scheduled_for: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          data: {
            title: goal.title,
            category: goal.category || 'General',
            completionTime: calculateCompletionTime(goal.created_at, goal.updated_at),
            nextSuggestions: generateNextGoalSuggestions(goal.category)
          },
          recurring: false,
          status: 'pending',
          created_at: now.toISOString()
        });
      }
    }

    // 5. Inactivity Reminders
    if (preferences.inactivity_reminder && daysSinceActivity >= 5) {
      let reminderTime;
      
      if (daysSinceActivity >= 14) {
        // Immediate reminder for long absence
        reminderTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
      } else {
        // Tomorrow morning for moderate absence
        reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        reminderTime.setHours(9, 0, 0, 0);
      }

      notifications.push({
        user_id: userId,
        notification_type: 'inactivity_reminder',
        scheduled_for: reminderTime.toISOString(),
        data: {
          lastActivity: lastActivity,
          daysSinceActivity: daysSinceActivity,
          activeGoalsCount: goals?.filter(g => g.status === 'active').length || 0
        },
        recurring: false,
        status: 'pending',
        created_at: now.toISOString()
      });
    }

    return notifications;

  } catch (error) {
    console.error('Error analyzing user for notifications:', error);
    return notifications;
  }
}

/**
 * Update scheduled notifications based on user preferences
 */
async function updateScheduledNotifications(userId, schedulePreferences) {
  try {
    // Cancel existing recurring notifications if disabled
    for (const [notificationType, enabled] of Object.entries(schedulePreferences)) {
      if (!enabled) {
        await supabase
          .from('scheduled_notifications')
          .update({ status: 'cancelled' })
          .eq('user_id', userId)
          .eq('notification_type', notificationType)
          .eq('status', 'pending');
      }
    }

    // Reschedule enabled notifications
    await analyzeUserForNotifications(userId);

  } catch (error) {
    console.error('Error updating scheduled notifications:', error);
  }
}

/**
 * Default notification preferences
 */
function getDefaultPreferences() {
  return {
    weekly_summary: true,
    progress_checkin: true,
    streak_celebration: true,
    goal_completion: true,
    inactivity_reminder: true,
    email_notifications: true,
    reminder_frequency: 'smart', // 'smart', 'daily', 'weekly', 'never'
    preferred_time: '09:00',
    timezone: 'UTC'
  };
}

/**
 * Validate and sanitize preferences
 */
function validatePreferences(preferences) {
  const defaults = getDefaultPreferences();
  const validated = { ...defaults };

  // Validate boolean preferences
  const booleanFields = [
    'weekly_summary', 'progress_checkin', 'streak_celebration', 
    'goal_completion', 'inactivity_reminder', 'email_notifications'
  ];

  for (const field of booleanFields) {
    if (typeof preferences[field] === 'boolean') {
      validated[field] = preferences[field];
    }
  }

  // Validate reminder frequency
  if (['smart', 'daily', 'weekly', 'never'].includes(preferences.reminder_frequency)) {
    validated.reminder_frequency = preferences.reminder_frequency;
  }

  // Validate preferred time
  if (preferences.preferred_time && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.preferred_time)) {
    validated.preferred_time = preferences.preferred_time;
  }

  // Validate timezone
  if (preferences.timezone && typeof preferences.timezone === 'string') {
    validated.timezone = preferences.timezone;
  }

  return validated;
}

// Helper functions
function getNextSunday(hour = 9, minute = 0) {
  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + (7 - now.getDay()));
  nextSunday.setHours(hour, minute, 0, 0);
  return nextSunday;
}

function getStreakMilestone(streak) {
  const milestones = {
    7: "One Week Strong!",
    14: "Two Weeks of Excellence!",
    30: "One Month Champion!",
    60: "Two Months of Dedication!",
    90: "Three Months of Consistency!",
    180: "Half Year Hero!",
    365: "One Year Legend!"
  };
  return milestones[streak] || `${streak} Days of Success!`;
}

function getStreakAchievements(streak) {
  const achievements = [];
  if (streak >= 7) achievements.push("Built a sustainable habit");
  if (streak >= 14) achievements.push("Proven consistency");
  if (streak >= 30) achievements.push("Formed lasting behavioral change");
  if (streak >= 60) achievements.push("Demonstrated unwavering commitment");
  if (streak >= 90) achievements.push("Achieved lifestyle transformation");
  if (streak >= 180) achievements.push("Mastered long-term goal achievement");
  if (streak >= 365) achievements.push("Became an inspiration to others");
  return achievements;
}

function calculateCompletionTime(createdAt, completedAt) {
  const days = Math.floor((new Date(completedAt) - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  if (days === 0) return "same day";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

function generateNextGoalSuggestions(category) {
  const suggestions = {
    'Fitness': [
      { title: "Advanced Fitness Challenge", description: "Take your fitness to the next level" },
      { title: "Nutrition Optimization", description: "Perfect your diet for better results" }
    ],
    'Career': [
      { title: "Leadership Development", description: "Build skills to lead and inspire others" },
      { title: "Industry Expertise", description: "Become a recognized expert in your field" }
    ],
    'Learning': [
      { title: "Advanced Skill Mastery", description: "Deepen your expertise in your chosen area" },
      { title: "Teaching Others", description: "Share your knowledge and help others learn" }
    ],
    'default': [
      { title: "Bigger Challenge", description: "Set an even more ambitious goal" },
      { title: "New Area", description: "Explore a completely different goal category" }
    ]
  };

  return suggestions[category] || suggestions.default;
}
