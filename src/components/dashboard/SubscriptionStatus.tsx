import React, { useEffect, useState } from 'react';
import { getUserSubscription } from '../../lib/supabase';
import { getProductByPriceId } from '../../stripe-config';

export function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const data = await getUserSubscription();
        setSubscription(data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription || !subscription.price_id) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Subscription</h3>
        <p className="text-gray-600">No active subscription</p>
      </div>
    );
  }

  const product = getProductByPriceId(subscription.price_id);
  const planName = product?.name || 'Unknown Plan';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-2">Current Plan</h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-semibold text-indigo-600">{planName}</p>
          <p className="text-sm text-gray-600 capitalize">
            Status: {subscription.subscription_status?.replace('_', ' ')}
          </p>
        </div>
        {subscription.subscription_status === 'active' && (
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
            <span className="text-sm text-green-600">Active</span>
          </div>
        )}
      </div>
    </div>
  );
}