'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Play, Search, Bell, Mail, Star, User } from 'lucide-react';

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
  const isActive = (href: string) => {
    if (href === '/shorts') return pathname === '/' || pathname.startsWith('/shorts');
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden xl:flex flex-col w-[260px] shrink-0 h-screen sticky top-0 px-4 py-4 border-r border-white/10">
      {/* Brand logo */}
      <Link href="/" className="px-2 mb-8 w-fit">
        <span className="text-2xl font-bold tracking-tight">
          only<span className="logo-gradient">feet</span>
        </span>
      </Link>

      {/* Nav */}
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

      {/* User pill */}
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f472b6] to-[#db2777] flex items-center justify-center text-white font-bold text-sm">我</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold truncate">我的账号</p>
          <p className="text-[13px] text-white/40 truncate">@myaccount</p>
        </div>
      </div>
    </aside>
  );
}
