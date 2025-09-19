// pages/api/stripe/create-checkout.js
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
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

    // Determine price based on plan
    const priceId = plan === 'annual' 
      ? process.env.STRIPE_ANNUAL_PRICE_ID    // $60/year
      : process.env.STRIPE_MONTHLY_PRICE_ID;  // $6/month

    if (!priceId) {
      return res.status(500).json({ message: 'Price configuration missing' });
    }

    // Create or get customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          source: 'goalverse_upgrade',
          plan: plan
        }
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/?upgrade_cancelled=true`,
      metadata: {
        email: email,
        plan: plan,
        source: 'goalverse_upgrade'
      },
      subscription_data: {
        metadata: {
          email: email,
          plan: plan,
          source: 'goalverse_upgrade'
        }
      },
      // Enable tax calculation if you have it configured
      automatic_tax: { enabled: false },
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    // Store the checkout session in Supabase for tracking
    try {
      await supabase
        .from('users')
        .upsert({ 
          email,
          stripe_customer_id: customer.id,
          stripe_checkout_session_id: session.id,
          selected_plan: plan,
          checkout_created_at: new Date().toISOString()
        }, { 
          onConflict: 'email',
          returning: 'minimal' 
        });
    } catch (dbError) {
      console.error('Database error (non-fatal):', dbError);
      // Continue with checkout even if DB update fails
    }

    // Send email with payment link
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const paymentLink = session.url;

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
              Ready to unlock unlimited goal coaching sessions?
            </p>
            
            <a href="${paymentLink}" style="background: linear-gradient(135deg, #00CFFF, #0EA5E9); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
              Complete Payment - ${plan === 'annual' ? '$60/year' : '$6/month'}
            </a>
            
            <div style="background-color: rgba(255, 214, 10, 0.1); border: 1px solid rgba(255, 214, 10, 0.3); border-radius: 8px; padding: 15px; margin-top: 20px;">
              <p style="color: #FFD60A; margin: 0; font-size: 14px; font-weight: bold;">
                ${plan === 'annual' ? '🎉 Annual Plan - Save 17%!' : '📅 Monthly Plan'}
              </p>
              <p style="color: #D1D5DB; margin: 5px 0 0 0; font-size: 14px;">
                Instant access after payment • 14-day money-back guarantee
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
                Priority AI responses (faster & detailed)
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Advanced progress tracking & analytics
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Export goals and conversations (PDF/CSV)
              </li>
              <li style="margin-bottom: 8px; display: flex; align-items: center;">
                <span style="color: #00CFFF; margin-right: 10px; font-weight: bold;">✓</span>
                Cloud sync across all devices
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
              <small>Secure payment link • 14-day money-back guarantee</small>
            </p>
          </div>
        </div>
      `
    });

    res.status(200).json({ 
      message: 'Payment link sent successfully',
      checkout_url: session.url,
      session_id: session.id
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ message: 'Failed to create payment link' });
  }
}
