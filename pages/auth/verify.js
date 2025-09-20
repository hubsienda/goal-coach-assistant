// pages/api/auth/verify.js
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
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Find user with this magic token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('magic_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Check if token has expired (24 hours)
    const tokenExpiry = new Date(user.magic_expires);
    const now = new Date();

    if (now > tokenExpiry) {
      // Clear expired token
      await supabase
        .from('users')
        .update({
          magic_token: null,
          magic_expires: null
        })
        .eq('id', user.id);

      return res.status(400).json({ message: 'Token has expired' });
    }

    // Token is valid - clear it and activate user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        magic_token: null,
        magic_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error clearing magic token:', updateError);
      return res.status(500).json({ message: 'Failed to verify token' });
    }

    // Set auth cookie
    res.setHeader('Set-Cookie', [
      `goalverse_auth=${user.id}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`
    ]);

    // Log successful verification
    await supabase
      .from('usage_logs')
      .insert({
        user_id: user.id,
        user_email: user.email,
        event_type: 'magic_link_verified',
        metadata: {
          verification_time: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        subscription_status: user.subscription_status
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Token verification failed' });
  }
}
