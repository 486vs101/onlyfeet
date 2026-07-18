'use client';

import { Creator } from '@/lib/types';
import { useState } from 'react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

type Props = { creator: Creator };

export function SubscribeButton({ creator }: Props) {
  const { user, profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClickSubscribe = () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    setShowModal(true);
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    // 写入 subscriptions 表
    await supabase.from('subscriptions').upsert({
      user_id: user.id,
      creator_id: creator.id,
      active: true
    });
    setSubscribed(true);
    setShowModal(false);
    setLoading(false);
  };

  const handleUnsubscribe = async () => {
    if (!user) return;
    await supabase.from('subscriptions').update({ active: false })
      .eq('user_id', user.id).eq('creator_id', creator.id);
    setSubscribed(false);
  };

  return (
    <>
      {subscribed ? (
        <button onClick={handleUnsubscribe} className="px-4 py-2 rounded-xl font-semibold text-sm border border-white/15 text-white hover:bg-white/5 transition">
          已订阅
        </button>
      ) : (
        <button onClick={handleClickSubscribe} className="px-4 py-2 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition">
          订阅 ${creator.subscriptionPrice}/月
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">订阅 {creator.displayName}</h2>
            <p className="text-[15px] text-white/50 mb-4">
              获取全部 {creator.postCount} 条帖子和 {creator.shortCount} 条短视频
            </p>
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px]">月度订阅</span>
                <span className="font-bold">${creator.subscriptionPrice}</span>
              </div>
              <div className="text-[13px] text-white/50">
                随时取消 · 80% 归创作者
              </div>
            </div>
            <button onClick={handleSubscribe} disabled={loading} className="w-full px-4 py-2 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition disabled:opacity-50 mb-2">
              {loading ? '处理中...' : '确认订阅'}
            </button>
            <button onClick={() => setShowModal(false)} className="w-full text-[15px] text-white/50 py-2 hover:text-white">
              取消
            </button>
            <p className="text-[13px] text-white/30 text-center mt-3">
              💳 Stripe 支付即将接入
            </p>
          </div>
        </div>
      )}
    </>
  );
}
