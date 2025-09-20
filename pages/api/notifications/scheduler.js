// pages/api/notifications/scheduler.js - Smart Notification Scheduler
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import EmailTemplateGenerator from '../../../utils/emailTemplates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const emailTemplateGenerator = new EmailTemplateGenerator();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return handleScheduleNotification(req, res);
  } else if (req.method === 'GET') {
    return handleProcessNotifications(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Schedule a new notification for a user
 */
async function handleScheduleNotification(req, res) {
  try {
    const {
      userId,
      notificationType,
      scheduledFor,
      data = {},
      recurring = false,
      recurringPattern = null
    } = req.body;

    if (!userId || !notificationType || !scheduledFor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert scheduled notification
    const { data: notification, error } = await supabase
      .from('scheduled_notifications')
      .insert([
        {
          user_id: userId,
          notification_type: notificationType,
          scheduled_for: scheduledFor,
          data: data,
          recurring: recurring,
          recurring_pattern: recurringPattern,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error scheduling notification:', error);
      return res.status(500).json({ error: 'Failed to schedule notification' });
    }

    res.status(201).json({ 
      success: true, 
      notification,
      message: 'Notification scheduled successfully'
    });

  } catch (error) {
    console.error('Error in handleScheduleNotification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process pending notifications (called by cron job or manual trigger)
 */
async function handleProcessNotifications(req, res) {
  try {
    const now = new Date().toISOString();
    
    // Get all pending notifications that are due
    const { data: pendingNotifications, error } = await supabase
      .from('scheduled_notifications')
      .select(`
        *,
        users(email, subscription_status, notification_preferences)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error fetching pending notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    const results = [];
    
    for (const notification of pendingNotifications) {
      try {
        const result = await processNotification(notification);
        results.push(result);
        
        // Update notification status
        await supabase
          .from('scheduled_notifications')
          .update({ 
            status: result.success ? 'sent' : 'failed',
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: result.error || null
          })
          .eq('id', notification.id);

        // Schedule recurring notification if applicable
        if (result.success && notification.recurring && notification.recurring_pattern) {
          await scheduleRecurringNotification(notification);
        }

      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        results.push({
          notificationId: notification.id,
          success: false,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      processed: results.length,
      results
    });

  } catch (error) {
    console.error('Error in handleProcessNotifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process individual notification
 */
async function processNotification(notification) {
  try {
    const user = notification.users;
    
    // Check if user has notifications enabled
    if (!user || !user.email) {
      return {
        notificationId: notification.id,
        success: false,
        error: 'User email not found'
      };
    }

    // Check notification preferences
    const preferences = user.notification_preferences || {};
    const notificationType = notification.notification_type;
    
    if (preferences[notificationType] === false) {
      return {
        notificationId: notification.id,
        success: false,
        error: 'User has disabled this notification type'
      };
    }

    // Generate email content based on notification type
    let emailHtml;
    let subject;

    switch (notificationType) {
      case 'weekly_summary':
        emailHtml = await generateWeeklySummaryEmail(user, notification.data);
        subject = 'Your Weekly GOALVERSE Progress Report';
        break;
        
      case 'progress_checkin':
        emailHtml = await generateProgressCheckInEmail(user, notification.data);
        subject = 'Time for a Goal Check-In';
        break;
        
      case 'streak_celebration':
        emailHtml = await generateStreakCelebrationEmail(user, notification.data);
        subject = `🔥 ${notification.data.currentStreak}-Day Streak Achievement!`;
        break;
        
      case 'goal_completion':
        emailHtml = await generateGoalCompletionEmail(user, notification.data);
        subject = '🎯 Goal Completed - Celebrate Your Win!';
        break;
        
      case 'inactivity_reminder':
        emailHtml = await generateInactivityReminderEmail(user, notification.data);
        subject = 'Your Goals Are Waiting For You';
        break;
        
      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }

    // Send email
    await sendEmail(user.email, subject, emailHtml);
    
    // Log notification sent
    await supabase
      .from('notification_logs')
      .insert([
        {
          user_id: notification.user_id,
          notification_type: notificationType,
          email: user.email,
          status: 'sent',
          sent_at: new Date().toISOString()
        }
      ]);

    return {
      notificationId: notification.id,
      success: true,
      email: user.email,
      type: notificationType
    };

  } catch (error) {
    console.error('Error processing notification:', error);
    return {
      notificationId: notification.id,
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate weekly summary email content
 */
async function generateWeeklySummaryEmail(user, data) {
  const { data: progressData } = await supabase
    .from('user_analytics_summary')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: insights } = await supabase
    .from('analytics_events')
    .select('event_data')
    .eq('user_id', user.id)
    .eq('event_type', 'ai_insight')
    .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(3);

  const userData = {
    firstName: extractFirstName(user.email),
    email: user.email,
    totalGoals: progressData?.total_goals || 0,
    completedThisWeek: data.completedThisWeek || 0,
    currentStreak: progressData?.current_streak || 0
  };

  const insightTexts = insights?.map(i => i.event_data?.insight) || [];

  return emailTemplateGenerator.generateWeeklySummary(
    userData,
    progressData || {},
    insightTexts
  );
}

/**
 * Generate progress check-in email content
 */
async function generateProgressCheckInEmail(user, data) {
  const { data: activeGoals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3);

  const userData = {
    firstName: extractFirstName(user.email),
    email: user.email
  };

  return emailTemplateGenerator.generateProgressCheckIn(
    userData,
    data.lastActivity,
    activeGoals || []
  );
}

/**
 * Generate streak celebration email content
 */
async function generateStreakCelebrationEmail(user, data) {
  const userData = {
    firstName: extractFirstName(user.email),
    email: user.email
  };

  return emailTemplateGenerator.generateStreakCelebration(
    userData,
    data
  );
}

/**
 * Generate goal completion email content
 */
async function generateGoalCompletionEmail(user, data) {
  const userData = {
    firstName: extractFirstName(user.email),
    email: user.email
  };

  return emailTemplateGenerator.generateGoalCompletion(
    userData,
    data
  );
}

/**
 * Generate inactivity reminder email content
 */
async function generateInactivityReminderEmail(user, data) {
  const { data: activeGoals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3);

  const userData = {
    firstName: extractFirstName(user.email),
    email: user.email
  };

  return emailTemplateGenerator.generateProgressCheckIn(
    userData,
    data.lastActivity,
    activeGoals || []
  );
}

/**
 * Schedule recurring notification
 */
async function scheduleRecurringNotification(originalNotification) {
  try {
    let nextScheduleTime;
    const currentTime = new Date(originalNotification.scheduled_for);

    switch (originalNotification.recurring_pattern) {
      case 'daily':
        nextScheduleTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextScheduleTime = new Date(currentTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextScheduleTime = new Date(currentTime);
        nextScheduleTime.setMonth(nextScheduleTime.getMonth() + 1);
        break;
      default:
        return; // Unknown pattern
    }

    await supabase
      .from('scheduled_notifications')
      .insert([
        {
          user_id: originalNotification.user_id,
          notification_type: originalNotification.notification_type,
          scheduled_for: nextScheduleTime.toISOString(),
          data: originalNotification.data,
          recurring: true,
          recurring_pattern: originalNotification.recurring_pattern,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      ]);

  } catch (error) {
    console.error('Error scheduling recurring notification:', error);
  }
}

/**
 * Send email using nodemailer
 */
async function sendEmail(to, subject, html) {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"GOALVERSE" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html
  });
}

/**
 * Extract first name from email
 */
function extractFirstName(email) {
  const localPart = email.split('@')[0];
  const name = localPart.split(/[._-]/)[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}
