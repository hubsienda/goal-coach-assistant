import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const buf = Buffer.concat([]);
  
  for await (const chunk of req) {
    buf.push(chunk);
  }

  const body = Buffer.concat(buf);
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;

      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ message: 'Webhook error' });
  }
}

async function handleCheckoutCompleted(session) {
  try {
    const customerEmail = session.metadata?.user_email || session.customer_details?.email;
    
    if (customerEmail) {
      await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription
        })
        .eq('email', customerEmail);
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    if (invoice.subscription) {
      await supabase
        .from('users')
        .update({ subscription_status: 'active' })
        .eq('stripe_subscription_id', invoice.subscription);
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    await supabase
      .from('users')
      .update({ 
        subscription_status: 'free',
        stripe_subscription_id: null
      })
      .eq('stripe_subscription_id', subscription.id);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}
