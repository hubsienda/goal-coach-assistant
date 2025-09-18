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
    const { email, plan = 'monthly', upgrade = false } = req.body;
    
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
        magic_expires: expires.toISOString(),
        selected_plan: plan // Store the selected plan
      }, { 
        onConflict: 'email',
        returning: 'minimal' 
      });

    if (error) throw error;

    // Send magic link email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const magicLink = `${process.env.NEXTAUTH_URL}/auth/verify?token=${token}`;

    // Email content for upgrade flow
    const emailContent = upgrade ? {
      subject: 'Your GOALVERSE Premium Upgrade Link',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0D1B2A; color: white;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <div style="width: 40px; height: 40px; background-color: #00CFFF; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <span style="color: #0D1B2A; font-weight: bold; font-size: 20px;">G</span>
              </div>
              <h1 style="color: #00CFFF; margin: 0; font-size: 24px;">GOALVERSE</h1>
            </div>
            <h2 style="color: white; margin: 0 0 10px 0;">Upgrade to Premium</h2>
            <p style="color: #9CA3AF; margin: 0;">Click below to start your 7-day free trial</p>
          </div>

          <!-- Main Content -->
          <div style="background-color: rgba(31, 41, 55, 0.5); border: 1px solid #374151; border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center;">
            <p style="color: #D1D5DB; margin-bottom: 25px; font-size: 16px;">
              Ready to unlock unlimited goal coaching sessions?
            </p>
            
            <a href="${magicLink}" style="background: linear-gradient(135deg, #00CFFF, #0EA5E9); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
              Start Your Free Trial
            </a>
            
            <div style="background-color: rgba(255, 214, 10, 0.1); border: 1px solid rgba(255, 214, 10, 0.3); border-radius: 8px; padding: 15px; margin-top: 20px;">
              <p style="color: #FFD60A; margin: 0; font-size: 14px; font-weight: bold;">
                ${plan === 'annual' ? '🎉 Annual Plan - Save 17%!' : '📅 Monthly Plan'}
              </p>
              <p style="color: #D1D5DB; margin: 5px 0 0 0; font-size: 14px;">
                ${plan === 'annual' ? '$60/year after trial' : '$6/month after trial'}
              </p>
            </div>
          </div>

          <!-- Benefits -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: white; margin-bottom: 15px;">Premium includes:</h3>
            <ul style="color: #D1D5DB; padding-left: 0; list-style: none;">
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Unlimited goal coaching sessions
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Advanced progress tracking
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Personalized action plans
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Priority AI responses
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Export your goals & progress
              </li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #374151; padding-top: 20px; text-align: center; color: #6B7280; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #FFD60A;">GOALVERSE by Naralimon</strong>
            </p>
            <p style="margin: 0; font-style: italic;">
              This email is sent by a robot that's terrible at small talk, so please don't reply expecting witty banter!
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
              <small>This link expires in 15 minutes.</small>
            </p>
          </div>
        </div>
      `
    } : {
      // Regular magic link (not upgrade)
      subject: 'Your GOALVERSE Magic Link',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; background-color: #0D1B2A; color: white;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
              <div style="width: 40px; height: 40px; background-color: #00CFFF; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                <span style="color: #0D1B2A; font-weight: bold; font-size: 20px;">G</span>
              </div>
              <h1 style="color: #00CFFF; margin: 0; font-size: 24px;">GOALVERSE</h1>
            </div>
            <h2 style="color: white; margin: 0 0 10px 0;">Welcome Back</h2>
            <p style="color: #9CA3AF; margin: 0;">Click below to access your account</p>
          </div>

          <!-- Main Content -->
          <div style="background-color: rgba(31, 41, 55, 0.5); border: 1px solid #374151; border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center;">
            <p style="color: #D1D5DB; margin-bottom: 25px; font-size: 16px;">
              Ready to continue your goal journey?
            </p>
            
            <a href="${magicLink}" style="background: linear-gradient(135deg, #00CFFF, #0EA5E9); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Access GOALVERSE
            </a>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid #374151; padding-top: 20px; text-align: center; color: #6B7280; font-size: 14px;">
            <p style="margin: 0 0 10px 0;">
              <strong style="color: #FFD60A;">GOALVERSE by Naralimon</strong>
            </p>
            <p style="margin: 0; font-style: italic;">
              This email is sent by a robot that's terrible at small talk, so please don't reply expecting witty banter!
            </p>
            <p style="margin: 10px 0 0 0; font-size: 12px;">
              <small>This link expires in 15 minutes.</small>
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail({
      from: `"GOALVERSE" <${process.env.SMTP_FROM}>`, // This sets the sender name
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    res.status(200).json({ message: 'Magic link sent successfully' });
  } catch (error) {
    console.error('Magic link error:', error);
    res.status(500).json({ message: 'Failed to send magic link' });
  }
}
