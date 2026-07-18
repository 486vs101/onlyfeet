'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Lock, Music2, Plus, GripVertical } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';

type ContentType = 'video' | 'gallery';

type GalleryItem = {
  file: File;
  previewUrl: string;
  duration: number; // 秒
};

export default function CreatePage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [type, setType] = useState<ContentType>('video');

  // 单视频
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');

  // 多图(可拖动排序)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  // 共同字段
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

  const videoInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const bgmInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user && profile) {
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

  // 单视频选择
  const handleVideoSelect = (f: File | null) => {
    if (!f) return;
    setVideoFile(f);
    setVideoPreviewUrl(URL.createObjectURL(f));
  };

  // 多图添加(可累加)
  const handleGalleryAdd = (files: FileList | null) => {
    if (!files) return;
    const newItems: GalleryItem[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      duration: 3, // 默认 3 秒
    }));
    setGalleryItems((prev) => [...prev, ...newItems]);
  };

  // 删除某张图
  const removeGalleryItem = (idx: number) => {
    setGalleryItems((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // 调整某张图的停留时间
  const setItemDuration = (idx: number, val: number) => {
    setGalleryItems((prev) => prev.map((it, i) => i === idx ? { ...it, duration: val } : it));
  };

  // 上移到顶部
  const moveItemUp = (idx: number) => {
    if (idx === 0) return;
    setGalleryItems((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  // BGM
  const handleBgm = (f: File | null) => {
    if (!f) return;
    setBgmFile(f);
    setBgmUrl(URL.createObjectURL(f));
  };

  const upload = async (f: File, bucket: string): Promise<string> => {
    const ext = f.name.split('.').pop();
    const name = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(name, f, { upsert: false });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(name);
    return publicUrl;
  };

  const handlePublish = async () => {
    setError('');
    if (type === 'video' && !videoFile) { setError('请上传视频'); return; }
    if (type === 'gallery' && galleryItems.length === 0) { setError('请至少上传一张图片'); return; }
    if (!caption.trim()) { setError('请填写标题'); return; }

    setUploading(true);
    setUploadProgress(10);

    try {
      // 决定 creator_id
      let creatorId = myCreator?.id;
      if (!creatorId) {
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

      // 上传媒体
      let mediaUrl = '';
      let galleryJson: any = null;
      if (type === 'video') {
        setUploadProgress(25);
        mediaUrl = await upload(videoFile!, 'videos');
      } else {
        // 多图逐个上传
        const uploadedItems: { url: string; duration: number }[] = [];
        for (let i = 0; i < galleryItems.length; i++) {
          const item = galleryItems[i];
          const url = await upload(item.file, 'images');
          uploadedItems.push({ url, duration: item.duration });
          setUploadProgress(25 + (50 * (i + 1) / galleryItems.length));
        }
        galleryJson = uploadedItems;
      }

      // 上传 BGM(可选)
      let bgmFinalUrl = bgmUrl;
      if (bgmFile) {
        setUploadProgress(80);
        bgmFinalUrl = await upload(bgmFile, 'bgm');
      }

      setUploadProgress(90);

      const tags = hashtags.split(/[,，\s]+/).filter((t) => t).map((t) => t.replace(/^#/, ''));
      const willLock = isCreator && isLocked;

      const insertData: any = {
        creator_id: creatorId,
        type,
        caption,
        hashtags: tags,
        placeholder_color: myCreator?.avatar_color || profile?.avatar_color || '#f472b6',
        media_url: type === 'video' ? mediaUrl : null,
        thumbnail_url: type === 'video' ? mediaUrl : null,
        bgm_title: bgmTitle || null,
        bgm_artist: bgmArtist || null,
        bgm_url: bgmFinalUrl || null,
        images: type === 'gallery' ? galleryJson : null,
        slide_duration: type === 'gallery' ? galleryItems[0]?.duration || 3 : null,
        is_locked: willLock,
        ppv_price: willLock ? ppvPrice : 0,
        access: willLock ? 'ppv' : 'free',
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };

      const { error: insertErr } = await supabase.from('shorts').insert(insertData);
      if (insertErr) throw insertErr;

      await supabase.from('creators').update({
        short_count: (myCreator?.short_count || 0) + 1
      }).eq('id', creatorId);

      setUploadProgress(100);
      router.push(`/post/${insertData.creator_id}`);  // 跳到创作者主页(后续优化)
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
        <p className="text-white/50 mb-6 text-sm">上传视频或多张图片(可同时加 BGM)</p>

        {/* 类型 */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button onClick={() => { setType('video'); setGalleryItems([]); }} className={`p-3 rounded-xl border transition ${type === 'video' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
            <VideoIcon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">视频</span>
          </button>
          <button onClick={() => { setType('gallery'); setVideoFile(null); }} className={`p-3 rounded-xl border transition ${type === 'gallery' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
            <ImageIcon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">图集</span>
          </button>
        </div>

        {/* 媒体区 */}
        {type === 'video' ? (
          <>
            {!videoPreviewUrl ? (
              <button onClick={() => videoInput.current?.click()} className="w-full h-48 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 hover:border-[#f472b6] transition">
                <Upload className="w-10 h-10 text-white/40" />
                <p className="text-white/60">点击上传视频 (mp4)</p>
                <p className="text-white/30 text-xs">最大 50MB · 保留原画质</p>
              </button>
            ) : (
              <div className="relative w-full h-64 rounded-2xl overflow-hidden bg-black">
                <video src={videoPreviewUrl} className="w-full h-full object-contain" controls autoPlay muted loop />
                <button onClick={() => { setVideoFile(null); setVideoPreviewUrl(''); }} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            <input ref={videoInput} type="file" accept="video/*" onChange={(e) => handleVideoSelect(e.target.files?.[0] || null)} className="hidden" />
          </>
        ) : (
          <>
            {/* 图集:可累加,每张图设置停留时间,显示顺序 */}
            <div className="space-y-3 mb-3">
              {galleryItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="flex flex-col gap-0.5">
                    {idx > 0 && (
                      <button onClick={() => moveItemUp(idx)} className="text-white/40 hover:text-white text-xs">▲</button>
                    )}
                  </div>
                  <img src={item.previewUrl} className="w-16 h-16 object-cover rounded-lg shrink-0" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{idx + 1}. {item.file.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-white/50">停留</span>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="0.5"
                        value={item.duration}
                        onChange={(e) => setItemDuration(idx, parseFloat(e.target.value) || 1)}
                        className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white"
                      />
                      <span className="text-xs text-white/50">秒</span>
                    </div>
                  </div>
                  <button onClick={() => removeGalleryItem(idx)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => galleryInput.current?.click()} className="w-full py-3 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center gap-2 hover:border-[#f472b6] transition text-white/70 hover:text-white">
              <Plus className="w-4 h-4" />
              {galleryItems.length === 0 ? '上传图片' : '添加更多图片'}
            </button>
            <input ref={galleryInput} type="file" accept="image/*" multiple onChange={(e) => handleGalleryAdd(e.target.files)} className="hidden" />
            {galleryItems.length > 0 && (
              <p className="text-white/40 text-xs text-center mt-2">共 {galleryItems.length} 张 · 短边停留时间(秒)</p>
            )}
          </>
        )}

        {/* 标题 */}
        <div className="mt-5">
          <label className="block text-sm font-medium mb-1.5 text-white/80">标题 / 描述</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={500} placeholder="说点什么..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition resize-none" />
        </div>

        {/* 标签 */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5 text-white/80">标签</label>
          <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="feet nailart aesthetic" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition" />
        </div>

        {/* BGM - 视频和图集都能用 */}
        <div className="mt-4 p-4 rounded-xl bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-[#f472b6]" />
              <span className="text-sm font-medium text-white/80">背景音乐(可选)</span>
            </div>
            {bgmUrl && <button onClick={() => { setBgmFile(null); setBgmUrl(''); setBgmTitle(''); setBgmArtist(''); }} className="text-xs text-white/50">移除</button>}
          </div>
          {!bgmUrl ? (
            <button onClick={() => bgmInput.current?.click()} className="w-full py-3 rounded-lg border border-dashed border-white/20 text-white/60 text-sm hover:border-[#f472b6]">
              上传音频 (mp3/wav)
            </button>
          ) : (
            <div className="space-y-2">
              <input value={bgmTitle} onChange={(e) => setBgmTitle(e.target.value)} placeholder="曲目名" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <input value={bgmArtist} onChange={(e) => setBgmArtist(e.target.value)} placeholder="艺术家" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              <audio src={bgmUrl} controls className="w-full" />
            </div>
          )}
          <input ref={bgmInput} type="file" accept="audio/*" onChange={(e) => handleBgm(e.target.files?.[0] || null)} className="hidden" />
        </div>

        {/* 付费 - 仅创作者 */}
        {isCreator && (
          <div className="mt-4 p-4 rounded-xl bg-white/5">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#f472b6]" />
                <span className="text-sm font-medium text-white/80">付费内容</span>
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
            <p className="text-white/50 text-xs">💡 开通<Link href="/become-creator" className="text-[#f472b6] ml-1 hover:underline">创作者</Link>后可发布付费内容</p>
          </div>
        )}

        {error && <div className="mt-4 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{error}</div>}

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

        <button onClick={handlePublish} disabled={uploading} className="mt-6 w-full py-3 rounded-xl text-white font-bold text-[15px] bg-gradient-to-r from-[#f472b6] to-[#db2777] hover:opacity-90 transition disabled:opacity-50">
          {uploading ? '发布中...' : '发布'}
        </button>
      </div>
    </div>
  );
}
