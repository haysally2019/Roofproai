export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price_per_unit: number;
  currency_symbol: string;
  mode: 'subscription' | 'payment';
  features: string[]; 
  popular?: boolean;
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_Tdogb5iSgVDyua',
    priceId: 'price_1SgX3WPi0ycIAEpYb38zmYPK', // Real ID from your dashboard
    name: 'Starter',
    description: '5 user max',
    price_per_unit: 199.00,
    currency_symbol: '$',
    mode: 'subscription',
    features: [
      "5 User Seats",
      "Basic AI Estimator",
      "Email Support",
      "Lead Management",
      "Task Tracking"
    ],
    popular: false
  },
  {
    id: 'prod_TdojAdvpSadlK4',
    priceId: 'price_1SgX5hPi0ycIAEpYimplJjy5', // Real ID from your dashboard
    name: 'Professional',
    description: '15 user max',
    price_per_unit: 499.00,
    currency_symbol: '$',
    mode: 'subscription',
    features: [
      "15 User Seats",
      "Advanced AI Vision",
      "Priority 24/7 Support",
      "Full CRM Automation",
      "QuickBooks Integration",
      "Advanced Reporting"
    ],
    popular: true
  },
  {
    id: 'prod_TdojIz2a7nj6JY',
    priceId: 'price_1SgX6FPi0ycIAEpYUM5UikDS', // Real ID from your dashboard
    name: 'Enterprise',
    description: 'unlimited users',
    price_per_unit: 999.00,
    currency_symbol: '$',
    mode: 'subscription',
    features: [
      "Unlimited Users",
      "Dedicated Success Manager",
      "Custom API Access",
      "White-label Reports",
      "On-site Training",
      "Multi-location Support"
    ],
    popular: false
  }
];

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}