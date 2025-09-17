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

    // Find user with valid token
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('magic_token', token)
      .gt('magic_expires', new Date().toISOString())
      .single();

    if (error || !user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Clear the magic token
    await supabase
      .from('users')
      .update({ 
        magic_token: null, 
        magic_expires: null 
      })
      .eq('id', user.id);

    // Set authentication cookie
    res.setHeader('Set-Cookie', `goalverse_auth=${user.id}; Path=/; HttpOnly; Max-Age=2592000`); // 30 days

    // Redirect to dashboard
    res.redirect(302, '/dashboard');

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
}
