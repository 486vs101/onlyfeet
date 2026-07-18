'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Edit3, X, Check, Camera, Image as ImageIcon } from 'lucide-react';
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

  // 编辑表单
  const [eName, setEName] = useState('');
  const [eBio, setEBio] = useState('');
  const [eAvatar, setEAvatar] = useState('');
  const [eCover, setECover] = useState('');
  const [eAvatarUrl, setEAvatarUrl] = useState<string>('');
  const [eCoverUrl, setECoverUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

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
      setEAvatarUrl(profile.avatar_url || '');
      setECoverUrl(profile.cover_url || '');
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

  const handleUpload = async (file: File, bucket: 'avatars' | 'covers') => {
    setUploading(bucket === 'avatars' ? 'avatar' : 'cover');
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      if (bucket === 'avatars') setEAvatarUrl(publicUrl);
      else setECoverUrl(publicUrl);
    } catch (e: any) {
      alert('上传失败: ' + e.message);
    }
    setUploading(null);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      display_name: eName,
      bio: eBio,
      avatar_color: eAvatar,
      cover_gradient: eCover,
      avatar_url: eAvatarUrl || null,
      cover_url: eCoverUrl || null,
    });
    setSaving(false);
    setEditing(false);
  };

  // 头像显示:url > 颜色 + 首字母
  const renderAvatar = (size: number, url?: string | null, color?: string, name?: string) => {
    const s = { width: size, height: size };
    if (url) return <img src={url} style={s} className="rounded-full object-cover" alt="" />;
    return (
      <div style={{ ...s, background: color }} className="rounded-full flex items-center justify-center text-white font-bold" >
        {name?.[0]?.toUpperCase() || '?'}
      </div>
    );
  };

  return (
    <div className="pb-12 bg-black">
      {/* 封面区 - 抖音风,加光斑装饰 */}
      <div
        className="relative h-48 sm:h-64 overflow-hidden"
        style={profile.cover_url ? { backgroundImage: `url(${profile.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: profile.cover_gradient || 'linear-gradient(135deg,#f472b6,#db2777)' }}
      >
        {!profile.cover_url && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-xl" />
          </div>
        )}
        {/* 半透明遮罩确保编辑按钮清晰 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <button
          onClick={() => setEditing(true)}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-sm hover:bg-black/70 transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
          编辑资料
        </button>
      </div>

      {/* 头像 - z-10 确保在背景上面 */}
      <div className="px-4 -mt-14 relative z-10">
        <div className="flex items-end justify-between">
          <div className="rounded-full p-1 bg-black">
            {renderAvatar(112, profile.avatar_url, profile.avatar_color, profile.display_name)}
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

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{profile.display_name}</h2>
            <span className="text-[#f472b6] text-sm">✓</span>
          </div>
          <p className="text-white/50 mt-0.5">@{profile.username}</p>
        </div>

        {profile.bio && <p className="mt-3 text-white/80 text-[15px] leading-relaxed">{profile.bio}</p>}

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

        <div className="mt-6 border-b border-white/10 flex">
          <button className="flex-1 py-3 text-sm font-bold border-b-2 border-[#f472b6] text-white">作品</button>
          <button className="flex-1 py-3 text-sm text-white/50 hover:text-white/80">喜欢</button>
          <button className="flex-1 py-3 text-sm text-white/50 hover:text-white/80">收藏</button>
        </div>

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
              <div className="rounded-xl overflow-hidden mb-5 relative">
                <div
                  className="h-24 relative"
                  style={eCoverUrl ? { backgroundImage: `url(${eCoverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: eCover }}
                >
                  {!eCoverUrl && (
                    <>
                      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-white/10 blur-xl" />
                    </>
                  )}
                </div>
                <div className="-mt-8 px-4 pb-3 relative z-10">
                  <div className="w-16 h-16 rounded-full p-1 bg-black inline-block shadow-lg">
                    {renderAvatar(56, eAvatarUrl, eAvatar, eName)}
                  </div>
                </div>
              </div>

              {/* 头像区 */}
              <div className="mb-5">
                <label className="block text-sm text-white/70 mb-2">头像</label>
                <div className="flex items-center gap-4">
                  {renderAvatar(64, eAvatarUrl, eAvatar, eName)}
                  <button
                    onClick={() => avatarInput.current?.click()}
                    disabled={uploading === 'avatar'}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 text-white text-sm hover:bg-white/5 transition disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    {uploading === 'avatar' ? '上传中...' : '上传图片'}
                  </button>
                  {eAvatarUrl && (
                    <button onClick={() => setEAvatarUrl('')} className="px-3 py-2.5 rounded-xl text-white/50 text-sm hover:text-white">
                      移除
                    </button>
                  )}
                </div>
                <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'avatars')} />
                <p className="text-white/40 text-xs mt-2">或选择纯色头像:</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => { setEAvatar(c); setEAvatarUrl(''); }} className={`w-8 h-8 rounded-full transition ${eAvatar === c && !eAvatarUrl ? 'ring-2 ring-white scale-110' : ''}`} style={{ background: c }} />
                  ))}
                </div>
              </div>

              {/* 背景区 */}
              <div className="mb-5">
                <label className="block text-sm text-white/70 mb-2">主页背景</label>
                <button
                  onClick={() => coverInput.current?.click()}
                  disabled={uploading === 'cover'}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/20 text-white/70 text-sm hover:border-[#f472b6] hover:text-white transition disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4" />
                  {uploading === 'cover' ? '上传中...' : '上传背景图片'}
                </button>
                <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'covers')} />
                <p className="text-white/40 text-xs mt-2">或选择预设渐变:</p>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {COVER_PRESETS.map((p) => (
                    <button key={p.name} type="button" onClick={() => { setECover(p.value); setECoverUrl(''); }} className={`h-10 rounded-lg transition ${eCover === p.value && !eCoverUrl ? 'ring-2 ring-white scale-105' : ''}`} style={{ background: p.value }} title={p.name} />
                  ))}
                </div>
              </div>

              {/* 昵称 */}
              <div className="mb-4">
                <label className="block text-sm text-white/70 mb-1.5">昵称</label>
                <input value={eName} onChange={(e) => setEName(e.target.value)} maxLength={30} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#f472b6]" />
              </div>

              {/* 简介 */}
              <div className="mb-6">
                <label className="block text-sm text-white/70 mb-1.5">个人简介</label>
                <textarea value={eBio} onChange={(e) => setEBio(e.target.value)} rows={3} maxLength={200} placeholder="说点关于你的..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#f472b6] resize-none" />
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
