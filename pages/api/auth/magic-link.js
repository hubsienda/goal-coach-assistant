import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Generate magic token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create or update user
    const { data: user, error } = await supabase
      .from('users')
      .upsert({ 
        email,
        magic_token: token,
        magic_expires: expires.toISOString()
      }, { 
        onConflict: 'email',
        returning: 'minimal' 
      });

    if (error) throw error;

    // Send magic link email
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const magicLink = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your GOALVERSE Magic Link',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #00CFFF;">Welcome to GOALVERSE</h2>
          <p>Click the link below to access your account:</p>
          <a href="${magicLink}" style="background: #00CFFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Access GOALVERSE
          </a>
          <p><small>This link expires in 15 minutes.</small></p>
        </div>
      `,
    });

    res.status(200).json({ message: 'Magic link sent successfully' });
  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ message: 'Failed to send magic link' });
  }
}
