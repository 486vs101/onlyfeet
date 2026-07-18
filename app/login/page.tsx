'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const msg = error.message;
      if (msg.includes('Invalid login credentials')) setError('邮箱或密码错误');
      else if (msg.includes('Email not confirmed')) setError('请先验证邮箱(查收验证邮件)');
      else setError(msg);
    } else {
      router.push('/shorts');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <div className="w-full max-w-md">
        <Link href="/shorts" className="block text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            only<span className="logo-gradient">feet</span>
          </h1>
        </Link>

        <h2 className="text-2xl font-bold mb-2 text-center">登录账号</h2>
        <p className="text-white/50 text-center mb-8 text-sm">继续浏览你喜欢的创作者</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f472b6] transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f472b6] transition"
            />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          还没有账号?
          <Link href="/register" className="text-[#f472b6] font-medium ml-1 hover:underline">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
