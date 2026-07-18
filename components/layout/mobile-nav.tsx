'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Bell, Mail, User } from 'lucide-react';

const tabs = [
  { href: '/',              icon: Home,   label: '首页' },
  { href: '/explore',       icon: Search, label: '发现' },
  { href: '/notifications', icon: Bell,   label: '通知' },
  { href: '/messages',      icon: Mail,   label: '消息' },
  { href: '/profile',       icon: User,   label: '我的' },
];

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 top-sticky border-t border-white/10">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 ${isActive(href) ? 'text-[#f472b6]' : 'text-white/40'}`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
