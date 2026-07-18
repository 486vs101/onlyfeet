'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Edit3, X, Check } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

const AVATAR_COLORS = ['#f472b6', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#fb7185', '#c084fc'];
const COVER_PRESETS = [
  { name: '粉紫', value: 'linear-gradient(135deg,#f472b6,#a78bfa)' },
  { name: '蓝紫', value: 'linear-gradient(135deg,#60a5fa,#a78bfa)' },
  { name: '粉红', value: 'linear-gradient(135deg,#fb7185,#f472b6)' },
  { name: '翠绿', value: 'linear-gradient(135deg,#34d399,#10b981)' },
  { name: '暖橙', value: 'linear-gradient(135deg,#fbbf24,#f87171)' },
  { name: '深夜', value: 'linear-gradient(135deg,#1e293b,#475569)' },
  { name: '薄荷', value: 'linear-gradient(135deg,#5eead4,#34d399)' },
  { name: '玫瑰', value: 'linear-gradient(135deg,#e879f9,#f472b6)' },
];

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [myShorts, setMyShorts] = useState<any[]>([]);
  const [myCreator, setMyCreator] = useState<any>(null);
  const [editing, setEditing] = useState(false);

  // 编辑表单状态
  const [eName, setEName] = useState('');
  const [eBio, setEBio] = useState('');
  const [eAvatar, setEAvatar] = useState('');
  const [eCover, setECover] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && profile?.is_creator) {
      supabase.from('creators').select('*').eq('owner_id', user.id).single()
        .then(({ data }) => {
          if (!data) return;
          setMyCreator(data);
          supabase.from('shorts').select('*').eq('creator_id', data.id).order('created_at', { ascending: false })
            .then(({ data: s }) => setMyShorts(s || []));
        });
    }
  }, [user, profile]);

  useEffect(() => {
    if (profile && editing) {
      setEName(profile.display_name);
      setEBio(profile.bio || '');
      setEAvatar(profile.avatar_color);
      setECover(profile.cover_gradient || COVER_PRESETS[0].value);
    }
  }, [profile, editing]);

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-black">
        <div className="text-center">
          <p className="mb-4 text-white/70">请先登录</p>
          <Link href="/login" className="inline-block px-6 py-2 rounded-xl bg-white text-black font-bold">去登录</Link>
        </div>
      </div>
    );
  }

  const totalLikes = myShorts.reduce((sum, s) => sum + (s.likes || 0), 0);
  const totalViews = myShorts.reduce((sum, s) => sum + (s.views || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      display_name: eName,
      bio: eBio,
      avatar_color: eAvatar,
      cover_color: '#831843',
      cover_gradient: eCover,
    });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="pb-12">
      {/* 顶部封面背景 - 抖音风格 */}
      <div className="relative h-48 sm:h-56" style={{ background: profile.cover_gradient || 'linear-gradient(135deg,#f472b6,#db2777)' }}>
        {/* 装饰光斑 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-xl" />
        </div>
        {/* 编辑按钮(右上角) */}
        <button
          onClick={() => setEditing(true)}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur text-white text-sm hover:bg-black/60 transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
          编辑资料
        </button>
      </div>

      {/* 头像 + 昵称 - 突出大头像(抖音风) */}
      <div className="px-4 -mt-12">
        <div className="flex items-end justify-between">
          <div className="w-24 h-24 rounded-full border-4 border-black flex items-center justify-center text-white font-bold text-3xl shadow-xl" style={{ background: profile.avatar_color }}>
            {profile.display_name[0].toUpperCase()}
          </div>
          {!profile.is_creator && (
            <Link href="/become-creator" className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white text-sm font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              成为创作者
            </Link>
          )}
          {profile.is_creator && (
            <Link href="/create" className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white text-sm font-bold">
              <Plus className="w-3.5 h-3.5" />
              发布
            </Link>
          )}
        </div>

        {/* 昵称 + 用户名 */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{profile.display_name}</h2>
            <span className="text-[#f472b6] text-sm">✓</span>
          </div>
          <p className="text-white/50 mt-0.5">@{profile.username}</p>
        </div>

        {/* 简介 */}
        {profile.bio && <p className="mt-3 text-white/80 text-[15px] leading-relaxed">{profile.bio}</p>}

        {/* 数据统计 - 抖音横排 */}
        <div className="mt-5 flex gap-6 text-center">
          <div>
            <p className="text-xl font-bold">{myShorts.length}</p>
            <p className="text-white/50 text-xs mt-0.5">作品</p>
          </div>
          <div>
            <p className="text-xl font-bold">{myCreator?.subscriber_count || 0}</p>
            <p className="text-white/50 text-xs mt-0.5">订阅者</p>
          </div>
          <div>
            <p className="text-xl font-bold">{totalLikes.toLocaleString()}</p>
            <p className="text-white/50 text-xs mt-0.5">获赞</p>
          </div>
          <div>
            <p className="text-xl font-bold">{totalViews.toLocaleString()}</p>
            <p className="text-white/50 text-xs mt-0.5">播放</p>
          </div>
        </div>

        {/* Tab 占位 */}
        <div className="mt-6 border-b border-white/10 flex">
          <button className="flex-1 py-3 text-sm font-bold border-b-2 border-[#f472b6] text-white">作品</button>
          <button className="flex-1 py-3 text-sm text-white/50 hover:text-white/80">喜欢</button>
          <button className="flex-1 py-3 text-sm text-white/50 hover:text-white/80">收藏</button>
        </div>

        {/* 作品网格 */}
        <div className="mt-2">
          {myShorts.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-12">
              {profile.is_creator ? '还没有发布作品,去发布一个吧' : '成为创作者后可以发布作品'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {myShorts.map((s: any) => (
                <Link key={s.id} href="/shorts" className="aspect-[3/4] relative overflow-hidden bg-zinc-900">
                  {s.media_url ? (
                    s.type === 'video' ? (
                      <video src={s.media_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={s.media_url} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs" style={{ background: s.placeholder_color || s.placeholderColor }}>
                      无媒体
                    </div>
                  )}
                  {/* 播放量 */}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] flex items-center gap-0.5">
                    ▶ {(s.views || 0).toLocaleString()}
                  </div>
                  {s.is_locked && <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-[10px]">🔒</div>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 编辑资料弹窗 */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setEditing(false)}>
          <div className="min-h-screen flex items-start justify-center px-4 py-8">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">编辑资料</h3>
                <button onClick={() => setEditing(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 预览 */}
              <div className="rounded-xl overflow-hidden mb-5" style={{ background: eCover }}>
                <div className="h-20" />
                <div className="-mt-8 px-4 pb-3">
                  <div className="w-16 h-16 rounded-full border-3 border-zinc-900 flex items-center justify-center text-white font-bold text-2xl" style={{ background: eAvatar }}>
                    {eName[0]?.toUpperCase() || '?'}
                  </div>
                </div>
              </div>

              {/* 昵称 */}
              <div className="mb-4">
                <label className="block text-sm text-white/70 mb-1.5">昵称</label>
                <input value={eName} onChange={(e) => setEName(e.target.value)} maxLength={30} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#f472b6]" />
              </div>

              {/* 简介 */}
              <div className="mb-4">
                <label className="block text-sm text-white/70 mb-1.5">个人简介</label>
                <textarea value={eBio} onChange={(e) => setEBio(e.target.value)} rows={3} maxLength={200} placeholder="说点关于你的..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#f472b6] resize-none" />
              </div>

              {/* 头像颜色 */}
              <div className="mb-4">
                <label className="block text-sm text-white/70 mb-2">头像颜色</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setEAvatar(c)} className={`w-9 h-9 rounded-full transition ${eAvatar === c ? 'ring-2 ring-white scale-110' : ''}`} style={{ background: c }} />
                  ))}
                </div>
              </div>

              {/* 主页背景 */}
              <div className="mb-6">
                <label className="block text-sm text-white/70 mb-2">主页背景</label>
                <div className="grid grid-cols-4 gap-2">
                  {COVER_PRESETS.map((p) => (
                    <button key={p.name} type="button" onClick={() => setECover(p.value)} className={`h-12 rounded-lg transition ${eCover === p.value ? 'ring-2 ring-white scale-105' : ''}`} style={{ background: p.value }} title={p.name} />
                  ))}
                </div>
              </div>

              <button onClick={handleSave} disabled={saving || !eName.trim()} className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? '保存中...' : <><Check className="w-4 h-4" /> 保存</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
