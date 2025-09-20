// pages/api/notifications/cleanup.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const results = {
      oldNotifications: 0,
      oldLogs: 0,
      expiredTokens: 0
    };

    // 1. Clean up old sent/failed notifications (older than 30 days)
    const { count: deletedNotifications, error: notificationError } = await supabase
      .from('scheduled_notifications')
      .delete({ count: 'exact' })
      .in('status', ['sent', 'failed'])
      .lt('sent_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!notificationError) {
      results.oldNotifications = deletedNotifications || 0;
    }

    // 2. Clean up old notification logs (older than 90 days)
    const { count: deletedLogs, error: logsError } = await supabase
      .from('notification_logs')
      .delete({ count: 'exact' })
      .lt('sent_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (!logsError) {
      results.oldLogs = deletedLogs || 0;
    }

    // 3. Clean up expired magic tokens
    const { count: expiredTokens, error: tokenError } = await supabase
      .from('users')
      .update({ 
        magic_token: null, 
        magic_expires: null 
      }, { count: 'exact' })
      .not('magic_token', 'is', null)
      .lt('magic_expires', new Date().toISOString());

    if (!tokenError) {
      results.expiredTokens = expiredTokens || 0;
    }

    // 4. Log cleanup activity
    await supabase
      .from('usage_logs')
      .insert({
        event_type: 'system_cleanup',
        metadata: {
          cleanup_time: new Date().toISOString(),
          deleted_notifications: results.oldNotifications,
          deleted_logs: results.oldLogs,
          expired_tokens: results.expiredTokens
        },
        created_at: new Date().toISOString()
      });

    res.status(200).json({
      success: true,
      message: 'Cleanup completed',
      results
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Cleanup failed',
      message: error.message 
    });
  }
}
