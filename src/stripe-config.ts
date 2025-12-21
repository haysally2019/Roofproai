export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price_per_unit: number;
  currency_symbol: string;
  mode: 'subscription' | 'payment';
  features: string[]; // Added this
  popular?: boolean;  // Added this
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_starter',
    priceId: 'price_1QVL36Gj4L7Wq3yVqX9X9X9X', // Replace with real ID
    name: 'Starter',
    description: 'For independent contractors.',
    price_per_unit: 99,
    currency_symbol: '$',
    mode: 'subscription',
    features: [
      "50 AI Leads / mo",
      "Basic Estimates",
      "Email Support",
      "1 User"
    ],
    popular: false
  },
  {
    id: 'prod_pro',
    priceId: 'price_1QVL3nGj4L7Wq3yVrBrBrBrB', // Replace with real ID
    name: 'Pro',
    description: 'For growing roofing teams.',
    price_per_unit: 199,
    currency_symbol: '$',
    mode: 'subscription',
    features: [
      "Unlimited AI Leads",
      "Advanced Damage Detection",
      "CRM & Calendar",
      "5 Users",
      "Priority Support"
    ],
    popular: true
  },
  {
    id: 'prod_enterprise',
    priceId: 'price_1QVL4CGj4L7Wq3yVsCsCsCsC', // Replace with real ID
    name: 'Enterprise',
    description: 'For multi-location companies.',
    price_per_unit: 399,
    currency_symbol: '$',
    mode: 'subscription',
    features: [
      "All Pro Features",
      "API Access",
      "White-labeling",
      "Unlimited Users",
      "Dedicated Manager"
    ],
    popular: false
  }
];

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}