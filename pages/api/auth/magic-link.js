// pages/api/auth/magic-link.js
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, plan = 'monthly' } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Create Stripe checkout session instead of magic token
    const checkoutResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/stripe/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, plan })
    });

    if (!checkoutResponse.ok) {
      const errorText = await checkoutResponse.text();
      console.error('Stripe checkout creation failed:', errorText);
      throw new Error('Failed to create payment session');
    }

    const checkoutData = await checkoutResponse.json();

    // Send email with payment link instead of magic link
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const paymentLink = checkoutData.checkout_url;

    await transporter.sendMail({
      from: `"GOALVERSE" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: 'Complete Your GOALVERSE Premium Upgrade',
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
            <h2 style="color: white; margin: 0 0 10px 0;">Complete Your Premium Upgrade</h2>
            <p style="color: #9CA3AF; margin: 0;">Secure payment • 14-day money-back guarantee</p>
          </div>

          <!-- Main Content -->
          <div style="background-color: rgba(31, 41, 55, 0.5); border: 1px solid #374151; border-radius: 12px; padding: 30px; margin-bottom: 30px; text-align: center;">
            <p style="color: #D1D5DB; margin-bottom: 25px; font-size: 16px;">
              You're one step away from unlimited goal coaching sessions!
            </p>
            
            <a href="${paymentLink}" style="background: linear-gradient(135deg, #00CFFF, #0EA5E9); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
              Complete Secure Payment - ${plan === 'annual' ? '$60/year' : '$6/month'}
            </a>
            
            <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 15px; margin-top: 20px;">
              <p style="color: #22C55E; margin: 0; font-size: 14px; font-weight: bold;">
                ${plan === 'annual' ? '🎉 Annual Plan - Save 17% ($12/year)' : '📅 Monthly Plan - Cancel Anytime'}
              </p>
              <p style="color: #D1D5DB; margin: 5px 0 0 0; font-size: 14px;">
                Instant premium access • 14-day money-back guarantee
              </p>
            </div>
          </div>

          <!-- Why Premium? -->
          <div style="margin-bottom: 30px;">
            <h3 style="color: white; margin-bottom: 15px; text-align: center;">Why upgrade to Premium?</h3>
            <div style="background-color: rgba(31, 41, 55, 0.3); border-radius: 8px; padding: 20px;">
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; align-items: center;">
                  <span style="color: #00CFFF; margin-right: 10px; font-weight: bold; font-size: 16px;">∞</span>
                  <span style="color: #D1D5DB; font-size: 14px;">Unlimited goal coaching sessions (vs 3/week free)</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #00CFFF; margin-right: 10px; font-weight: bold; font-size: 16px;">⚡</span>
                  <span style="color: #D1D5DB; font-size: 14px;">Priority AI responses - faster & more detailed</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #00CFFF; margin-right: 10px; font-weight: bold; font-size: 16px;">📊</span>
                  <span style="color: #D1D5DB; font-size: 14px;">Advanced progress tracking & analytics</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #00CFFF; margin-right: 10px; font-weight: bold; font-size: 16px;">💾</span>
                  <span style="color: #D1D5DB; font-size: 14px;">Export goals and conversations (PDF/CSV)</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #00CFFF; margin-right: 10px; font-weight: bold; font-size: 16px;">☁️</span>
                  <span style="color: #D1D5DB; font-size: 14px;">Cloud sync across all your devices</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Security Notice -->
          <div style="background-color: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 8px; padding: 15px; margin-bottom: 30px; text-align: center;">
            <p style="color: #22C55E; margin: 0; font-size: 13px;">
              🔒 Secure payment powered by Stripe • Your card details are never stored on our servers
            </p>
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
              Questions? Contact us at <a href="mailto:support@goalverse.app" style="color: #00CFFF;">support@goalverse.app</a>
            </p>
          </div>
        </div>
      `
    });

    res.status(200).json({ 
      message: 'Payment link sent successfully',
      checkout_url: checkoutData.checkout_url 
    });

  } catch (error) {
    console.error('Payment link creation error:', error);
    res.status(500).json({ message: 'Failed to send payment link' });
  }
}
