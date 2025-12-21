import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StripeProduct } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

interface PricingCardProps {
  product: StripeProduct;
  isPopular?: boolean;
}

export function PricingCard({ product, isPopular }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    if (!user) {
      const currentUrl = encodeURIComponent(window.location.pathname);
      navigate(`/login?redirect=${currentUrl}&priceId=${product.priceId}`);
      return;
    }

    try {
      const checkoutUrl = await createCheckoutSession(product.priceId, product.mode);
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative rounded-2xl border ${
      isPopular 
        ? 'border-indigo-500 shadow-lg scale-105' 
        : 'border-gray-200 shadow-sm'
    } bg-white p-8`}>
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>
        <p className="mt-2 text-gray-600">{product.description}</p>
        
        <div className="mt-6">
          <span className="text-4xl font-bold text-gray-900">
            {product.currency_symbol}{product.price_per_unit}
          </span>
          <span className="text-gray-600">/month</span>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isPopular
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? 'Loading...' : user ? 'Get Started' : 'Sign Up to Continue'}
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>

      <div className="mt-8">
        <ul className="space-y-3">
          <li className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-gray-700">Full CRM access</span>
          </li>
          <li className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-gray-700">Lead management</span>
          </li>
          <li className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-gray-700">Task tracking</span>
          </li>
          <li className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-3" />
            <span className="text-gray-700">Calendar integration</span>
          </li>
        </ul>
      </div>
    </div>
  );
}