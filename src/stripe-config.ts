export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price_per_unit: number;
  currency_symbol: string;
  mode: 'subscription' | 'payment';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TdojIz2a7nj6JY',
    priceId: 'price_1SgX6FPi0ycIAEpYUM5UikDS',
    name: 'Enterprise',
    description: 'unlimited users',
    price_per_unit: 999.00,
    currency_symbol: '$',
    mode: 'subscription'
  },
  {
    id: 'prod_TdojAdvpSadlK4',
    priceId: 'price_1SgX5hPi0ycIAEpYimplJjy5',
    name: 'Professional',
    description: '15 user max',
    price_per_unit: 499.00,
    currency_symbol: '$',
    mode: 'subscription'
  },
  {
    id: 'prod_Tdogb5iSgVDyua',
    priceId: 'price_1SgX3WPi0ycIAEpYb38zmYPK',
    name: 'Starter',
    description: '5 user max',
    price_per_unit: 199.00,
    currency_symbol: '$',
    mode: 'subscription'
  }
];

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}