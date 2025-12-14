import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';

// Initialize Stripe only if API key is provided
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

if (!stripe) {
  console.warn('⚠️  STRIPE_SECRET_KEY not configured - payment features disabled');
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export interface PlanConfig {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number; // in cents
  stripePriceId: string;
  features: {
    streamingMinutes: number; // -1 = unlimited
    quality: '720p' | '1080p' | '4K';
    maxParticipants: number;
    aiAssistant: boolean;
    recording: boolean;
    support: 'community' | 'email' | 'priority';
  };
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    stripePriceId: '', // No Stripe price for free plan
    features: {
      streamingMinutes: 120, // 2 hours/month
      quality: '720p',
      maxParticipants: 3,
      aiAssistant: false,
      recording: false,
      support: 'community',
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2900, // $29.00
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    features: {
      streamingMinutes: -1, // Unlimited
      quality: '1080p',
      maxParticipants: 10,
      aiAssistant: true,
      recording: true,
      support: 'email',
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9900, // $99.00
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    features: {
      streamingMinutes: -1, // Unlimited
      quality: '4K',
      maxParticipants: 20,
      aiAssistant: true,
      recording: true,
      support: 'priority',
    },
  },
};

export class StripeService {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Create Stripe customer for user
   */
  async createCustomer(userId: string, email: string, name: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    // Save customer ID to database
    await this.db.query(
      'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
      [customer.id, userId]
    );

    return customer.id;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    plan: 'pro' | 'enterprise',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    // Get or create Stripe customer
    const [user] = await this.db.query(
      'SELECT email, name, stripe_customer_id FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      customerId = await this.createCustomer(userId, user.email, user.name);
    }

    const planConfig = PLANS[plan];
    if (!planConfig || !planConfig.stripePriceId) {
      throw new Error('Invalid plan');
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: planConfig.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        plan,
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Create portal session for managing subscription
   */
  async createPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    const [user] = await this.db.query(
      'SELECT stripe_customer_id FROM users WHERE id = ?',
      [userId]
    );

    if (!user || !user.stripe_customer_id) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    // Save webhook event
    await this.db.query(
      `INSERT INTO webhook_events (id, event_type, stripe_event_id, payload) 
       VALUES (?, ?, ?, ?)`,
      [uuidv4(), event.type, event.id, JSON.stringify(event.data.object)]
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await this.db.query(
      'UPDATE webhook_events SET processed = TRUE WHERE stripe_event_id = ?',
      [event.id]
    );
  }

  /**
   * Handle checkout completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'pro' | 'enterprise';

    if (!userId || !plan) {
      console.error('Missing metadata in checkout session');
      return;
    }

    // Subscription will be handled by subscription.created event
    console.log(`Checkout completed for user ${userId}, plan ${plan}`);
  }

  /**
   * Handle subscription created/updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;

    // Get user by Stripe customer ID
    const [user] = await this.db.query(
      'SELECT id FROM users WHERE stripe_customer_id = ?',
      [customerId]
    );

    if (!user) {
      console.error(`User not found for customer ${customerId}`);
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    let plan: 'pro' | 'enterprise' = 'pro';

    // Determine plan from price ID
    if (priceId === PLANS.enterprise.stripePriceId) {
      plan = 'enterprise';
    }

    const status = subscription.status;
    const currentPeriodStart = new Date(subscription.current_period_start * 1000);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    // Update or create subscription record
    const [existingSub] = await this.db.query(
      'SELECT id FROM subscriptions WHERE stripe_subscription_id = ?',
      [subscription.id]
    );

    if (existingSub) {
      // Update existing subscription
      await this.db.query(
        `UPDATE subscriptions 
         SET status = ?, current_period_start = ?, current_period_end = ?, 
             cancel_at_period_end = ?, updated_at = NOW()
         WHERE stripe_subscription_id = ?`,
        [
          status,
          currentPeriodStart,
          currentPeriodEnd,
          subscription.cancel_at_period_end,
          subscription.id,
        ]
      );
    } else {
      // Create new subscription
      await this.db.query(
        `INSERT INTO subscriptions 
         (id, user_id, plan, status, stripe_subscription_id, stripe_price_id, 
          current_period_start, current_period_end, cancel_at_period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          user.id,
          plan,
          status,
          subscription.id,
          priceId,
          currentPeriodStart,
          currentPeriodEnd,
          subscription.cancel_at_period_end,
        ]
      );
    }

    // Update user plan if subscription is active
    if (status === 'active' || status === 'trialing') {
      await this.db.query(
        'UPDATE users SET plan = ?, updated_at = NOW() WHERE id = ?',
        [plan, user.id]
      );
    }
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    // Downgrade user to free plan
    await this.db.query(
      `UPDATE users u
       JOIN subscriptions s ON s.user_id = u.id
       SET u.plan = 'free', u.updated_at = NOW()
       WHERE s.stripe_subscription_id = ?`,
      [subscription.id]
    );

    // Update subscription status
    await this.db.query(
      `UPDATE subscriptions 
       SET status = 'canceled', updated_at = NOW()
       WHERE stripe_subscription_id = ?`,
      [subscription.id]
    );
  }

  /**
   * Handle payment succeeded
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Payment succeeded for invoice ${invoice.id}`);
    // Additional logic if needed (e.g., send receipt email)
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log(`Payment failed for invoice ${invoice.id}`);
    
    // Update subscription status to past_due
    if (invoice.subscription) {
      await this.db.query(
        `UPDATE subscriptions 
         SET status = 'past_due', updated_at = NOW()
         WHERE stripe_subscription_id = ?`,
        [invoice.subscription]
      );
    }

    // Send notification email to user
    // TODO: Implement email notification
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<void> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    const [subscription] = await this.db.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND status = "active"',
      [userId]
    );

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // Cancel at period end (don't cancel immediately)
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await this.db.query(
      'UPDATE subscriptions SET cancel_at_period_end = TRUE WHERE stripe_subscription_id = ?',
      [subscription.stripe_subscription_id]
    );
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(userId: string): Promise<void> {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }
    const [subscription] = await this.db.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ? AND cancel_at_period_end = TRUE',
      [userId]
    );

    if (!subscription) {
      throw new Error('No subscription to reactivate');
    }

    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await this.db.query(
      'UPDATE subscriptions SET cancel_at_period_end = FALSE WHERE stripe_subscription_id = ?',
      [subscription.stripe_subscription_id]
    );
  }

  /**
   * Get user subscription
   */
  async getUserSubscription(userId: string): Promise<any> {
    const [subscription] = await this.db.query(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return subscription || null;
  }
}
