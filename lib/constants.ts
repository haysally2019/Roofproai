export const SUBSCRIPTION_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 199,
    maxUsers: 5,
    stripePriceId: 'price_12345_starter', // Replace with ID from Stripe Dashboard
    features: ['5 Users', 'Basic Estimator', 'Email Support']
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 499,
    maxUsers: 15,
    stripePriceId: 'price_12345_pro', // Replace with ID from Stripe Dashboard
    features: ['15 Users', 'Advanced AI', 'Priority Support']
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    maxUsers: 999,
    stripePriceId: 'price_12345_ent', // Replace with ID from Stripe Dashboard
    features: ['Unlimited Users', 'Dedicated Success Manager', 'Custom Integrations']
  }
};