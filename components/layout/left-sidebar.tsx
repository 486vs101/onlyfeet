'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Play, Search, Bell, Mail, Star, User, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';

const navItems = [
  { href: '/shorts',        icon: Play,     label: '刷视频' },
  { href: '/explore',       icon: Search,   label: '发现' },
  { href: '/notifications', icon: Bell,     label: '通知' },
  { href: '/messages',      icon: Mail,     label: '消息' },
  { href: '/subscriptions', icon: Star,     label: '订阅' },
  { href: '/profile',       icon: User,     label: '我的' },
];

export function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === '/shorts') return pathname === '/' || pathname.startsWith('/shorts');
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden xl:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 px-4 py-4 border-r border-white/10">
      <Link href="/" className="px-2 mb-8 w-fit">
        <span className="text-2xl font-bold tracking-tight">
          only<span className="logo-gradient">feet</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl text-[15px] transition-colors ${
              isActive(href)
                ? 'bg-white/[0.08] font-bold text-white'
                : 'font-normal text-white/70 hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* 用户区 */}
      {user && profile ? (
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: profile.avatar_color }}>
            {profile.display_name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold truncate">{profile.display_name}</p>
            <p className="text-[13px] text-white/40 truncate">@{profile.username}</p>
          </div>
          <button
            onClick={async () => { await signOut(); router.push('/shorts'); }}
            className="text-[13px] text-white/50 hover:text-white"
            title="退出登录"
          >
            退出
          </button>
        </div>
      ) : (
        <Link href="/login" className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#f472b6]/20 to-[#db2777]/20 hover:from-[#f472b6]/30 hover:to-[#db2777]/30 transition">
          <LogIn className="w-5 h-5 text-[#f472b6]" />
          <span className="text-[15px] font-semibold text-white">登录 / 注册</span>
        </Link>
      )}
    </aside>
  );
}
