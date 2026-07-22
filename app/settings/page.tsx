'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';
import { User, Bell, Shield, LogOut, ChevronRight, Moon, Globe, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  // Preferences
  const [lang, setLang] = useState('zh');
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [email, setEmail] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [blockedNames, setBlockedNames] = useState<Record<string, string>>({});
  const [showBlocked, setShowBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load preferences from profile
  useEffect(() => {
    if (!user || !profile) return;
    setEmail(user.email || '');
    supabase.from('profiles').select('preferences').eq('id', user.id).maybeSingle()
      .then(({ data }) => {
        const prefs = data?.preferences || {};
        if (prefs.lang) setLang(prefs.lang);
        if (typeof prefs.darkMode === 'boolean') setDarkMode(prefs.darkMode);
        if (typeof prefs.notifications === 'boolean') setNotifications(prefs.notifications);
        if (prefs.blocked) setBlockedList(prefs.blocked);
        // Fetch blocked user names
        if (prefs.blocked && prefs.blocked.length > 0) {
          supabase.from('profiles').select('id,display_name').in('id', prefs.blocked)
            .then(({ data: p }) => {
              const map: Record<string, string> = {};
              (p || []).forEach(x => { map[x.id] = x.display_name; });
              setBlockedNames(map);
            });
        }
      });
  }, [user, profile]);

  // Save preferences
  const savePrefs = async (updates: Record<string, any>) => {
    if (!user) return;
    setSaving(true);
    const { data } = await supabase.from('profiles').select('preferences').eq('id', user.id).maybeSingle();
    const current = data?.preferences || {};
    await supabase.from('profiles').update({ preferences: { ...current, ...updates } }).eq('id', user.id);
    setSaving(false);
  };

  const toggleLang = () => {
    const next = lang === 'zh' ? 'en' : 'zh';
    setLang(next); savePrefs({ lang: next });
  };
  const toggleDark = () => {
    const next = !darkMode; setDarkMode(next); savePrefs({ darkMode: next });
  };
  const toggleNotify = () => {
    const next = !notifications; setNotifications(next); savePrefs({ notifications: next });
  };

  // Change password
  const handleChangePassword = async () => {
    setPwError(''); setPwSuccess('');
    if (!newPassword || newPassword.length < 6) { setPwError('新密码至少 6 位'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setPwError(error.message);
    else { setPwSuccess('密码已更新'); setShowChangePassword(false); setOldPassword(''); setNewPassword(''); }
  };

  // Blocked users
  const unblock = (id: string) => {
    const next = blockedList.filter(b => b !== id);
    setBlockedList(next); savePrefs({ blocked: next });
  };

  const handleLogout = async () => { await signOut(); router.push('/'); };

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
        <h2 className="text-xs text-white/40 uppercase tracking-wide mb-3">账号</h2>

        <button onClick={() => router.push('/profile')} className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02] rounded-lg px-2 -mx-2">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-white/60" />
            <div className="text-left"><p className="text-[15px]">编辑资料</p><p className="text-[13px] text-white/40">@{profile?.username || user.email}</p></div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>

        <div className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg">
          <div className="flex items-center gap-3"><Mail className="w-5 h-5 text-white/60" /><span className="text-[15px]">邮箱</span></div>
          <span className="text-[13px] text-white/40">{email}</span>
        </div>

        <button onClick={() => setShowChangePassword(!showChangePassword)} className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02] rounded-lg px-2 -mx-2">
          <div className="flex items-center gap-3"><Lock className="w-5 h-5 text-white/60" /><span className="text-[15px]">修改密码</span></div>
          <ChevronRight className={`w-4 h-4 text-white/30 transition ${showChangePassword ? 'rotate-90' : ''}`} />
        </button>
        {showChangePassword && (
          <div className="ml-10 mt-2 space-y-3 mb-3">
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="新密码（至少 6 位）"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#f472b6]" />
              <button onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
            {pwSuccess && <p className="text-green-400 text-xs">{pwSuccess}</p>}
            <button onClick={handleChangePassword} className="px-4 py-1.5 rounded-lg bg-[#f472b6] text-white text-xs font-bold">确认修改</button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-xs text-white/40 uppercase tracking-wide mb-3">通知</h2>
        <div onClick={toggleNotify} className="flex items-center justify-between py-3 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-white/[0.02]">
          <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-white/60" /><span className="text-[15px]">推送通知</span></div>
          <button className={`relative w-11 h-6 rounded-full transition ${notifications ? 'bg-[#f472b6]' : 'bg-white/20'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${notifications ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Privacy & Blocked */}
      <div className="p-4 border-b border-white/5">
        <h2 className="text-xs text-white/40 uppercase tracking-wide mb-3">隐私</h2>
        <button onClick={() => setShowBlocked(!showBlocked)} className="w-full flex items-center justify-between py-3 hover:bg-white/[0.02] rounded-lg px-2 -mx-2">
          <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-white/60" /><span className="text-[15px]">黑名单</span></div>
          <span className="text-[13px] text-white/40">{blockedList.length > 0 ? `${blockedList.length} 人` : ''}<ChevronRight className={`w-4 h-4 text-white/30 inline ml-1 transition ${showBlocked ? 'rotate-90' : ''}`} /></span>
        </button>
        {showBlocked && (
          <div className="ml-10 mt-2 space-y-2">
            {blockedList.length === 0 ? <p className="text-white/30 text-sm">没有拉黑任何人</p> :
             blockedList.map((uid, i) => (
               <div key={i} className="flex items-center justify-between py-1"><span className="text-white/60 text-sm">{blockedNames[uid] || uid.slice(0,8)+'...'}</span><button onClick={() => unblock(uid)} className="text-red-400 text-xs">移除</button></div>
             ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="p-4">
        <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-red-500/20 transition">
          <LogOut className="w-4 h-4" /> 退出登录
        </button>
      </div>

      <p className="text-center text-white/20 text-xs pb-8">onlyfeet v1.0</p>
    </div>
  );
}
