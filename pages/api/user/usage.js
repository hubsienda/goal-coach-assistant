import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  try {
    const userAgent = req.headers['user-agent'];
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (req.method === 'GET') {
      // Get current usage
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.query.userId)
        .single();

      if (user) {
        return res.status(200).json({
          subscription_status: user.subscription_status,
          usage_count: user.usage_count,
          usage_week_start: user.usage_week_start
        });
      }

      // For free users (no account), check IP limits
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabase
        .from('usage_logs')
        .select('*')
        .eq('ip_address', ip)
        .eq('date', today)
        .single();

      return res.status(200).json({
        subscription_status: 'free',
        daily_goals_count: usage?.goals_created_today || 0,
        can_create_goal: !usage || usage.goals_created_today < 10
      });
    }

    if (req.method === 'POST') {
      // Track goal creation
      const { userId, action } = req.body;

      if (action === 'create_goal') {
        if (userId) {
          // Premium user - update their usage
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (user.subscription_status === 'active') {
            return res.status(200).json({ success: true, limit_reached: false });
          }

          // Free user with account - check weekly limits
          const weekStart = new Date(user.usage_week_start);
          const now = new Date();
          const weeksDiff = Math.floor((now - weekStart) / (7 * 24 * 60 * 60 * 1000));

          if (weeksDiff >= 1) {
            // Reset weekly counter
            await supabase
              .from('users')
              .update({
                usage_count: 1,
                usage_week_start: now.toISOString().split('T')[0]
              })
              .eq('id', userId);
            
            return res.status(200).json({ success: true, limit_reached: false });
          }

          if (user.usage_count >= 3) {
            return res.status(200).json({ success: false, limit_reached: true });
          }

          // Increment usage
          await supabase
            .from('users')
            .update({ usage_count: user.usage_count + 1 })
            .eq('id', userId);
        } else {
          // Anonymous user - check IP limits
          const today = new Date().toISOString().split('T')[0];
          const { data: usage } = await supabase
            .from('usage_logs')
            .select('*')
            .eq('ip_address', ip)
            .eq('date', today)
            .single();

          if (usage && usage.goals_created_today >= 10) {
            return res.status(200).json({ success: false, limit_reached: true });
          }

          // Update or create usage log
          await supabase
            .from('usage_logs')
            .upsert({
              ip_address: ip,
              date: today,
              goals_created_today: usage ? usage.goals_created_today + 1 : 1
            }, { onConflict: 'ip_address,date' });
        }

        return res.status(200).json({ success: true, limit_reached: false });
      }
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Usage tracking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
