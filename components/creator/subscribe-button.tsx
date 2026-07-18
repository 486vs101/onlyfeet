'use client';

import { Creator } from '@/lib/types';
import { useState } from 'react';

type Props = { creator: Creator };

export function SubscribeButton({ creator }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [subscribed, setSubscribed] = useState(creator.isSubscribed);

  const handleSubscribe = () => {
    setShowModal(false);
    setSubscribed(true);
  };

  const handleUnsubscribe = () => {
    setSubscribed(false);
  };

  return (
    <>
      {subscribed ? (
        <button
          onClick={handleUnsubscribe}
          className="x-btn-outline text-sm"
        >
          Subscribed
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="x-btn-accent text-sm"
        >
          Subscribe ${creator.subscriptionPrice}/mo
        </button>
      )}

      {/* Mock subscribe modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--bg-primary)_/_0.75)] backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-[hsl(var(--card-bg))] border-[hsl(var(--border))] rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Subscribe to {creator.displayName}</h2>
            <p className="text-[15px] text-white/50 mb-4">
              Get access to all {creator.postCount} posts and {creator.shortCount} shorts
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px]">Monthly</span>
                <span className="font-bold">${creator.subscriptionPrice}</span>
              </div>
              <div className="text-[13px] text-white/50">
                Cancel anytime · 80% goes to creator
              </div>
            </div>
            <button onClick={handleSubscribe} className="w-full x-btn-accent mb-2">
              Confirm subscription
            </button>
            <button onClick={() => setShowModal(false)} className="w-full text-[15px] text-white/50 py-2 hover:text-white">
              Cancel
            </button>
            <p className="text-[13px] text-white/30 text-center mt-3">
              💳 Stripe Connect integration coming soon
            </p>
          </div>
        </div>
      )}
    </>
  );
}