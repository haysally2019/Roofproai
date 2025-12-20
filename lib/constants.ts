export const SUBSCRIPTION_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 199,
    maxUsers: 5,
    stripePriceId: 'price_1SgX3WPi0ycIAEpYb38zmYPK', // Fixed: Updated to Price ID
    features: ['5 Users', 'Basic Estimator', 'Email Support']
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    price: 499,
    maxUsers: 15,
    stripePriceId: 'price_1SgX5hPi0ycIAEpYimplJjy5', // Fixed: Updated to Price ID
    features: ['15 Users', 'Advanced AI', 'Priority Support']
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    maxUsers: 999,
    stripePriceId: 'price_1SgX6FPi0ycIAEpYUM5UikDS', // Fixed: Updated to Price ID
    features: ['Unlimited Users', 'Dedicated Success Manager', 'Custom Integrations']
  }
};