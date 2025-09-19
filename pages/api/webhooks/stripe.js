// pages/api/webhooks/stripe.js
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id);

  try {
    // Get customer details
    const customer = await stripe.customers.retrieve(session.customer);
    const subscription = await stripe.subscriptions.retrieve(session.subscription);

    // Determine plan type
    const priceId = subscription.items.data[0].price.id;
    const isAnnual = priceId === process.env.STRIPE_ANNUAL_PRICE_ID;
    const plan = isAnnual ? 'annual' : 'monthly';

    // Update user in database
    const { error } = await supabase
      .from('users')
      .upsert({
        email: customer.email,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_plan: plan,
        subscription_start: new Date(subscription.created * 1000).toISOString(),
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        usage_count: 0, // Reset usage for new premium users
        usage_week_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      });

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    // Log the activation
    await supabase
      .from('usage_logs')
      .insert({
        user_email: customer.email,
        event_type: 'subscription_activated',
        metadata: {
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          plan: plan,
          amount: subscription.items.data[0].price.unit_amount,
          currency: subscription.items.data[0].price.currency
        },
        created_at: new Date().toISOString()
      });

    console.log(`Premium activated for ${customer.email} - ${plan} plan`);
  } catch (error) {
    console.error('Error handling checkout completed:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  // Additional logic if needed when subscription is created
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);

  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    
    // Determine current status
    let status = 'free';
    if (subscription.status === 'active') {
      status = 'active';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    } else if (subscription.status === 'canceled') {
      status = 'cancelled';
    }

    // Update user subscription status
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: status,
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }

    // Log the change
    await supabase
      .from('usage_logs')
      .insert({
        user_email: customer.email,
        event_type: 'subscription_updated',
        metadata: {
          old_status: subscription.status,
          new_status: status,
          stripe_subscription_id: subscription.id
        },
        created_at: new Date().toISOString()
      });

    console.log(`Subscription updated for ${customer.email}: ${status}`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription cancelled:', subscription.id);

  try {
    const customer = await stripe.customers.retrieve(subscription.customer);

    // Revert user to free tier
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: 'free',
        subscription_plan: null,
        subscription_current_period_end: null,
        usage_count: 0, // Reset usage when downgrading
        usage_week_start: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('Error downgrading to free tier:', error);
      throw error;
    }

    // Log the cancellation
    await supabase
      .from('usage_logs')
      .insert({
        user_email: customer.email,
        event_type: 'subscription_cancelled',
        metadata: {
          stripe_subscription_id: subscription.id,
          cancelled_at: new Date(subscription.canceled_at * 1000).toISOString()
        },
        created_at: new Date().toISOString()
      });

    console.log(`Subscription cancelled for ${customer.email} - reverted to free tier`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded:', invoice.id);

  try {
    const customer = await stripe.customers.retrieve(invoice.customer);

    // Log successful payment
    await supabase
      .from('usage_logs')
      .insert({
        user_email: customer.email,
        event_type: 'payment_succeeded',
        metadata: {
          invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString()
        },
        created_at: new Date().toISOString()
      });

    console.log(`Payment succeeded for ${customer.email}: ${invoice.amount_paid} ${invoice.currency}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
    // Don't throw - payment succeeded, just logging failed
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed:', invoice.id);

  try {
    const customer = await stripe.customers.retrieve(invoice.customer);

    // Log failed payment
    await supabase
      .from('usage_logs')
      .insert({
        user_email: customer.email,
        event_type: 'payment_failed',
        metadata: {
          invoice_id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          attempt_count: invoice.attempt_count
        },
        created_at: new Date().toISOString()
      });

    // If this is a recurring payment failure, the subscription will be updated
    // to past_due status, which will be handled by handleSubscriptionUpdated

    console.log(`Payment failed for ${customer.email}: ${invoice.amount_due} ${invoice.currency}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
    // Don't throw - we still want to acknowledge the webhook
  }
}
