'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (username.length < 3) {
      setError('用户名至少 3 个字符');
      setLoading(false);
      return;
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setError('用户名只能包含小写字母、数字、下划线');
      setLoading(false);
      return;
    }
    const { error } = await signUp(email, password, username, displayName || username);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-green-500">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">注册成功!</h2>
          <p className="text-white/60 mb-6">请查看邮箱 <b>{email}</b> 完成验证</p>
          <Link href="/login" className="inline-block px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition">
            返回登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black py-8">
      <div className="w-full max-w-md">
        <Link href="/shorts" className="block text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            only<span className="logo-gradient">feet</span>
          </h1>
        </Link>

        <h2 className="text-2xl font-bold mb-2 text-center">创建账号</h2>
        <p className="text-white/50 text-center mb-8 text-sm">加入 onlyfeet 社区</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">显示名</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="昵称"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f472b6] transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">
              用户名 <span className="text-white/40">(英文小写,作为 @ 唯一标识)</span>
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              minLength={3}
              placeholder="my_account"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f472b6] transition"
            />
          </div>
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
            <label className="block text-sm font-medium mb-1.5 text-white/80">
              密码 <span className="text-white/40">(至少 6 位)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f472b6] transition"
            />
          </div>

          {error && <div className="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-bold text-[15px] bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-white/50 text-sm mt-6">
          已有账号?
          <Link href="/login" className="text-[#f472b6] font-medium ml-1 hover:underline">
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
