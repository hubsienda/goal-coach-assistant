// pages/api/stripe/verify-payment.js
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription', 'customer']
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        message: 'Payment not completed',
        payment_status: session.payment_status 
      });
    }

    // Get customer and subscription details
    const customer = session.customer;
    const subscription = session.subscription;

    if (!subscription) {
      return res.status(400).json({ message: 'No subscription found for this session' });
    }

    // Determine plan type from price ID
    const priceId = subscription.items.data[0].price.id;
    const isAnnual = priceId === process.env.STRIPE_ANNUAL_PRICE_ID;
    const plan = isAnnual ? 'annual' : 'monthly';

    // Get or create user in database
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', customer.email)
      .single();

    let userId;

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_start: new Date(subscription.created * 1000).toISOString(),
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          usage_count: 0, // Reset usage for premium users
          usage_week_start: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', customer.email)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw updateError;
      }

      userId = updatedUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: customer.email,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          subscription_status: 'active',
          subscription_plan: plan,
          subscription_start: new Date(subscription.created * 1000).toISOString(),
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          usage_count: 0,
          usage_week_start: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      userId = newUser.id;
    }

    // Log the successful verification
    await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        user_email: customer.email,
        event_type: 'payment_verified',
        metadata: {
          session_id: session_id,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          plan: plan,
          amount: session.amount_total,
          currency: session.currency
        },
        created_at: new Date().toISOString()
      });

    // Return success response with user data
    res.status(200).json({
      success: true,
      user_id: userId,
      email: customer.email,
      plan: plan,
      subscription_status: 'active',
      subscription_id: subscription.id,
      customer_id: customer.id,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      amount_paid: session.amount_total,
      currency: session.currency
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Return appropriate error response
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        message: 'Invalid session ID',
        error: error.message 
      });
    }

    return res.status(500).json({ 
      message: 'Payment verification failed',
      error: error.message 
    });
  }
}
