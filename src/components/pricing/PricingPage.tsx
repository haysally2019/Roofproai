import React from 'react';
import { stripeProducts } from '../../stripe-config';
import { PricingCard } from './PricingCard';

export function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Select the perfect plan for your roofing business
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:gap-12">
          {stripeProducts.map((product, index) => (
            <PricingCard
              key={product.id}
              product={product}
              isPopular={index === 1} // Make Professional plan popular
            />
          ))}
        </div>
      </div>
    </div>
  );
}