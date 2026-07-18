'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function BecomeCreatorPage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [price, setPrice] = useState(5);
  const [avatarColor, setAvatarColor] = useState('#f472b6');
  const [coverColor, setCoverColor] = useState('#831843');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setPrice(profile.subscription_price || 5);
    }
    if (!user && profile === null) {
      // 未登录
    }
  }, [profile, user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="text-center">
          <p className="mb-4 text-white/70">请先登录</p>
          <Link href="/login" className="inline-block px-6 py-2 rounded-xl bg-white text-black font-bold">去登录</Link>
        </div>
      </div>
    );
  }

  if (profile?.is_creator) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">你已经是创作者了!</h2>
          <p className="text-white/60 mb-6">去发布你的第一个内容吧</p>
          <button onClick={() => router.push('/create')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white font-bold inline-flex items-center gap-2">
            发布内容 <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. 更新 profiles
    const { error: updateErr } = await updateProfile({
      display_name: displayName,
      username: username || undefined,
      bio,
      subscription_price: price,
      avatar_color: avatarColor,
      is_creator: true
    });
    if (updateErr) {
      setError('开通失败: ' + updateErr.message);
      setLoading(false);
      return;
    }

    // 2. 在 creators 表创建一行
    const { error: creatorErr } = await supabase.from('creators').insert({
      username: username,
      display_name: displayName,
      avatar_color: avatarColor,
      cover_color: coverColor,
      bio: bio,
      subscription_price: price,
      verified: false,
      subscriber_count: 0,
      post_count: 0,
      short_count: 0,
      owner_id: user.id  // 关联到 auth user
    });
    if (creatorErr) {
      setError('创建创作者失败: ' + creatorErr.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push('/create');
  };

  const colors = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#fb7185', '#c084fc'];

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/shorts" className="block text-center mb-6">
          <h1 className="text-2xl font-bold">
            only<span className="logo-gradient">feet</span>
          </h1>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-7 h-7 text-[#f472b6]" />
          <h2 className="text-2xl font-bold">成为创作者</h2>
        </div>
        <p className="text-white/50 mb-8 text-sm">开通后可以发布视频/图片/音频,获得订阅收入</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">显示名</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">
              用户名 <span className="text-white/40">(英文小写,作为 @ 唯一标识)</span>
            </label>
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required minLength={3} pattern="[a-z0-9_]+" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">个人简介</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={200} placeholder="介绍你自己..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">
              订阅价格 <span className="text-white/40">(月费,USD)</span>
            </label>
            <div className="flex items-center gap-3">
              <input type="number" min="0.99" max="99.99" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} required className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition" />
              <span className="text-white/60">/月</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">头像颜色</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setAvatarColor(c)} className={`w-10 h-10 rounded-full border-2 transition ${avatarColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ background: c }} />
              ))}
            </div>
          </div>

          {error && <div className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{error}</div>}

          <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-[15px] bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {loading ? '处理中...' : <>立即开通 <ArrowRight className="w-4 h-4" /></>}
          </button>

          <p className="text-white/40 text-xs text-center">
            开通即同意创作者条款 · 80% 订阅收入归创作者
          </p>
        </form>
      </div>
    </div>
  );
}
