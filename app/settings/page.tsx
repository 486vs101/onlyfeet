'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';
import { User, Bell, Shield, LogOut, ChevronRight, Moon, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) return (
    <div className="flex items-center justify-center h-[80vh] text-white/30">
      <div className="text-center"><User className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>请先登录</p></div>
    </div>
  );

  return (
    <div>
      <h1 className="text-xl font-bold px-4 py-4 border-b border-white/10">设置</h1>

      {/* Account */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-xs text-white/40 uppercase mb-3">账号</h2>
        <button className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-white/60" />
            <div className="text-left"><p className="text-sm">编辑资料</p><p className="text-xs text-white/40">{profile?.display_name || user.email}</p></div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
        <button className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-white/60" />
            <span className="text-sm">语言</span>
          </div>
          <span className="text-white/40 text-sm mr-2">中文</span>
        </button>
        <button className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-white/60" />
            <span className="text-sm">深色模式</span>
          </div>
          <span className="text-white/40 text-sm mr-2">已开启</span>
        </button>
      </div>

      {/* Notifications */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-xs text-white/40 uppercase mb-3">通知</h2>
        <button className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02]">
          <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-white/60" /><span className="text-sm">推送通知</span></div>
          <span className="text-white/40 text-sm mr-2">已开启</span>
        </button>
      </div>

      {/* Privacy */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-xs text-white/40 uppercase mb-3">隐私</h2>
        <button className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02]">
          <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-white/60" /><span className="text-sm">隐私设置</span></div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
        <button className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02]">
          <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-white/60" /><span className="text-sm">黑名单</span></div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
      </div>

      {/* Logout */}
      <div className="p-4">
        <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-500/20">
          <LogOut className="w-4 h-4" /> 退出登录
        </button>
      </div>

      <p className="text-center text-white/20 text-xs pb-8">onlyfeet v1.0</p>
    </div>
  );
}
