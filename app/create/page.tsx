'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, X, Image as ImageIcon, Music, Video as VideoIcon, Lock } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

type ContentType = 'video' | 'image' | 'audio';

export default function CreatePage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [type, setType] = useState<ContentType>('video');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [bgmTitle, setBgmTitle] = useState('');
  const [bgmArtist, setBgmArtist] = useState('');
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmUrl, setBgmUrl] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [ppvPrice, setPpvPrice] = useState(2);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [myCreator, setMyCreator] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bgmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && profile) {
      // 创作者用 creators 表关联,普通用户的作品直接挂在 user_id 上
      supabase.from('creators').select('*').eq('owner_id', user.id).maybeSingle()
        .then(({ data }) => setMyCreator(data));
    }
  }, [user, profile]);

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

  const isCreator = profile?.is_creator || !!myCreator;

  const handleFile = (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const handleBgm = (f: File | null) => {
    if (!f) return;
    setBgmFile(f);
    setBgmUrl(URL.createObjectURL(f));
  };

  const upload = async (f: File, bucket: string): Promise<string> => {
    const ext = f.name.split('.').pop();
    const name = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(name, f, { upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(name);
    return publicUrl;
  };

  const handlePublish = async () => {
    if (!file || !caption.trim()) {
      setError('请上传文件并填写标题');
      return;
    }
    setError('');
    setUploading(true);
    setUploadProgress(10);

    try {
      // 1. 上传主文件
      const bucket = type === 'video' ? 'videos' : type === 'image' ? 'images' : 'bgm';
      setUploadProgress(30);
      const mainUrl = await upload(file, bucket);

      // 2. 上传 BGM(可选)
      let bgmFinalUrl = bgmUrl;
      if (bgmFile) {
        setUploadProgress(60);
        bgmFinalUrl = await upload(bgmFile, 'bgm');
      }

      setUploadProgress(80);

      // 3. 决定 creator_id:有就用,没有就自动创建
      let creatorId = myCreator?.id;
      if (!creatorId) {
        // 普通用户自动创建 creator 行
        const { data: newCreator, error: ncErr } = await supabase.from('creators').insert({
          username: profile?.username || `user_${user.id.slice(0, 8)}`,
          display_name: profile?.display_name || '新创作者',
          avatar_color: profile?.avatar_color || '#f472b6',
          cover_color: '#831843',
          bio: profile?.bio || '',
          subscription_price: 0,
          verified: false,
          subscriber_count: 0,
          post_count: 0,
          short_count: 0,
          owner_id: user.id,
        }).select().single();
        if (ncErr) throw ncErr;
        creatorId = newCreator.id;
        setMyCreator(newCreator);
        await updateProfile({ is_creator: true });
      }

      // 4. 写入 shorts 表
      const tags = hashtags.split(/[,，\s]+/).filter(t => t).map(t => t.replace(/^#/, ''));
      const willLock = isCreator && isLocked; // 普通用户不允许锁
      const { error: insertErr } = await supabase.from('shorts').insert({
        creator_id: creatorId,
        type: type === 'image' ? 'gallery' : type,
        caption,
        hashtags: tags,
        placeholder_color: myCreator?.avatar_color || profile?.avatar_color || '#f472b6',
        media_url: mainUrl,
        thumbnail_url: type === 'video' ? mainUrl : mainUrl,
        bgm_title: bgmTitle || null,
        bgm_artist: bgmArtist || null,
        bgm_url: bgmFinalUrl || null,
        is_locked: willLock,
        ppv_price: willLock ? ppvPrice : 0,
        access: willLock ? 'ppv' : 'free',
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0
      });
      if (insertErr) throw insertErr;

      // 5. 更新创作者统计
      await supabase.from('creators').update({
        short_count: (myCreator?.short_count || 0) + 1
      }).eq('id', creatorId);

      setUploadProgress(100);
      router.push('/shorts');
    } catch (e: any) {
      setError('发布失败: ' + (e.message || '未知错误'));
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-8 px-4 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/shorts" className="block text-center mb-6">
          <h1 className="text-2xl font-bold">
            only<span className="logo-gradient">feet</span>
          </h1>
        </Link>
        <h2 className="text-2xl font-bold mb-2">发布内容</h2>
        <p className="text-white/50 mb-6 text-sm">上传视频、图片或音频</p>

        {/* 类型选择 */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { key: 'video' as ContentType, label: '视频', icon: VideoIcon },
            { key: 'image' as ContentType, label: '图集', icon: ImageIcon },
            { key: 'audio' as ContentType, label: '音频', icon: Music },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setType(key); setFile(null); setPreviewUrl(''); }} className={`p-3 rounded-xl border transition ${type === key ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>

        {/* 文件上传 */}
        {!previewUrl ? (
          <button onClick={() => fileRef.current?.click()} className="w-full h-48 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:border-[#f472b6] transition">
            <Upload className="w-10 h-10 text-white/40" />
            <p className="text-white/60">点击上传{type === 'video' ? '视频 (mp4)' : type === 'image' ? '图片 (jpg/png)' : '音频 (mp3)'}</p>
            <p className="text-white/30 text-xs">最大 50MB · 保留原画质</p>
          </button>
        ) : (
          <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black">
            {type === 'video' && (
              <video src={previewUrl} className="w-full h-full object-contain" controls autoPlay muted loop />
            )}
            {type === 'image' && (
              <img src={previewUrl} className="w-full h-full object-contain" alt="preview" />
            )}
            {type === 'audio' && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ background: myCreator?.avatar_color }}>
                <Music className="w-16 h-16 text-white" />
                <audio src={previewUrl} controls />
              </div>
            )}
            <button onClick={() => { setFile(null); setPreviewUrl(''); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept={type === 'video' ? 'video/*' : type === 'image' ? 'image/*' : 'audio/*'} onChange={(e) => handleFile(e.target.files?.[0] || null)} className="hidden" />

        {/* 标题 */}
        <div className="mt-5">
          <label className="block text-sm font-medium mb-1.5 text-white/80">标题 / 描述</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={500} placeholder="说点什么..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition resize-none" />
        </div>

        {/* 标签 */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5 text-white/80">
            标签 <span className="text-white/40">(用空格或逗号分隔)</span>
          </label>
          <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="feet nailart aesthetic" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition" />
        </div>

        {/* BGM(仅视频) */}
        {type === 'video' && (
          <div className="mt-4 p-4 rounded-xl bg-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white/80">背景音乐(可选)</span>
              {bgmUrl && <button onClick={() => { setBgmFile(null); setBgmUrl(''); setBgmTitle(''); setBgmArtist(''); }} className="text-xs text-white/50">移除</button>}
            </div>
            {!bgmUrl ? (
              <button onClick={() => bgmRef.current?.click()} className="w-full py-3 rounded-lg border border-dashed border-white/20 text-white/60 text-sm hover:border-[#f472b6]">
                上传音频 (mp3/wav)
              </button>
            ) : (
              <div className="space-y-2">
                <input value={bgmTitle} onChange={(e) => setBgmTitle(e.target.value)} placeholder="曲目名" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                <input value={bgmArtist} onChange={(e) => setBgmArtist(e.target.value)} placeholder="艺术家" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                <audio src={bgmUrl} controls className="w-full" />
              </div>
            )}
            <input ref={bgmRef} type="file" accept="audio/*" onChange={(e) => handleBgm(e.target.files?.[0] || null)} className="hidden" />
          </div>
        )}

        {/* 付费设置 - 仅创作者可见 */}
        {isCreator && (
          <div className="mt-4 p-4 rounded-xl bg-white/5">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#f472b6]" />
                <span className="text-sm font-medium text-white/80">付费内容(单条)</span>
              </div>
              <button type="button" onClick={() => setIsLocked(!isLocked)} className={`relative w-11 h-6 rounded-full transition ${isLocked ? 'bg-[#f472b6]' : 'bg-white/20'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${isLocked ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
            {isLocked && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-white/60">$</span>
                <input type="number" min="0.99" max="99.99" step="0.01" value={ppvPrice} onChange={(e) => setPpvPrice(parseFloat(e.target.value))} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                <span className="text-sm text-white/60">一次性解锁</span>
              </div>
            )}
          </div>
        )}
        {!isCreator && (
          <div className="mt-4 p-3 rounded-xl bg-white/5 text-center">
            <p className="text-white/50 text-xs">
              💡 开通<Link href="/become-creator" className="text-[#f472b6] ml-1 hover:underline">创作者</Link>后可发布付费内容
            </p>
          </div>
        )}

        {error && <div className="mt-4 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{error}</div>}

        {/* 进度条 */}
        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-white/60 mb-1">
              <span>上传中...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#f472b6] to-[#db2777] transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <button onClick={handlePublish} disabled={uploading || !file} className="mt-6 w-full py-3 rounded-xl text-white font-bold text-[15px] bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition disabled:opacity-50">
          {uploading ? '发布中...' : '发布'}
        </button>
      </div>
    </div>
  );
}
