'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, X, Image as ImageIcon, Video as VideoIcon, Music2, FileText, Plus } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { supabase } from '@/lib/supabase';
import { ImageCropper } from '@/components/image-cropper';

type PublishType = 'short' | 'post';
type MediaType = 'video' | 'gallery' | 'post_text';

type GalleryItem = { file: File; previewUrl: string; duration: number };

export default function CreatePage() {
  const router = useRouter();
  const { user, profile, updateProfile } = useAuth();
  const [publishType, setPublishType] = useState<PublishType>('short');

  // 作品相关
  const [mediaType, setMediaType] = useState<MediaType>('video');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [coverUrl, setCoverUrl] = useState<string>('');

  // 帖子相关
  const [postBody, setPostBody] = useState('');

  // 共同
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [bgmTitle, setBgmTitle] = useState('');
  const [bgmArtist, setBgmArtist] = useState('');
  const [bgmFile, setBgmFile] = useState<File | null>(null);
  const [bgmUrl, setBgmUrl] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);
  const [ppvPrice, setPpvPrice] = useState(2);
  const [isPinned, setIsPinned] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [myCreator, setMyCreator] = useState<any>(null);

  const videoInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const bgmInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  // 裁切状态
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'cover' | null>(null);

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

  const isCreator = true;

  // 媒体上传器(视频/图集共用)
  const renderMediaUploader = () => {
    if (mediaType === 'video') {
      return (
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
      );
    }
    if (mediaType === 'gallery') {
      return (
        <>
          <div className="space-y-3 mb-3">
            {galleryItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="flex flex-col gap-0.5">
                  {idx > 0 && <button onClick={() => moveItemUp(idx)} className="text-white/40 hover:text-white text-xs">▲</button>}
                </div>
                <img src={item.previewUrl} className="w-16 h-16 object-cover rounded-lg shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{idx + 1}. {item.file.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-white/50">停留</span>
                    <input type="number" min="1" max="30" step="0.5" value={item.duration} onChange={(e) => setItemDuration(idx, parseFloat(e.target.value) || 1)} className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white" />
                    <span className="text-xs text-white/50">秒</span>
                  </div>
                </div>
                <button onClick={() => removeGalleryItem(idx)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => galleryInput.current?.click()} className="w-full py-3 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center gap-2 hover:border-[#f472b6] text-white/70 hover:text-white">
            <Plus className="w-4 h-4" />
            {galleryItems.length === 0 ? '上传图片' : '添加更多图片'}
          </button>
          <input ref={galleryInput} type="file" accept="image/*" multiple onChange={(e) => handleGalleryAdd(e.target.files)} className="hidden" />
        </>
      );
    }
    return null;
  };

  const handleVideoSelect = (f: File | null) => {
    if (!f) return;
    setVideoFile(f);
    setVideoPreviewUrl(URL.createObjectURL(f));
  };

  const handleGalleryAdd = (files: FileList | null) => {
    if (!files) return;
    const newItems: GalleryItem[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      duration: 3,
    }));
    setGalleryItems((prev) => [...prev, ...newItems]);
  };

  const removeGalleryItem = (idx: number) => {
    setGalleryItems((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const setItemDuration = (idx: number, val: number) => {
    setGalleryItems((prev) => prev.map((it, i) => i === idx ? { ...it, duration: val } : it));
  };

  const moveItemUp = (idx: number) => {
    if (idx === 0) return;
    setGalleryItems((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  // 封面选择 → 弹出裁切
  const handleCoverSelect = (f: File | null) => {
    if (!f) return;
    setCropSrc(URL.createObjectURL(f));
    setCropTarget('cover');
  };

  const onCropSave = async (blob: Blob) => {
    if (!cropTarget) return;
    const ext = 'jpg';
    const path = `${user.id}/cover_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('thumbnails').upload(path, blob, { upsert: false });
    if (error) { alert('封面上传失败: ' + error.message); setCropSrc(null); setCropTarget(null); return; }
    const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(path);
    setCoverUrl(publicUrl);
    setCropSrc(null);
    setCropTarget(null);
  };

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

    // 校验
    if (publishType === 'short') {
      if (mediaType === 'video' && !videoFile) { setError('请上传视频'); return; }
      if (mediaType === 'gallery' && galleryItems.length === 0) { setError('请至少上传一张图片'); return; }
    } else {
      // 帖子:必须有内容或媒体
      if (mediaType === 'video' && !videoFile) { setError('请上传视频'); return; }
      if (mediaType === 'gallery' && galleryItems.length === 0) { setError('请至少上传一张图片'); return; }
      if (mediaType === 'post_text' && !postBody.trim()) { setError('请输入帖子内容'); return; }
    }
    if (!caption.trim()) { setError('请填写标题'); return; }

    setUploading(true);
    setUploadProgress(10);

    try {
      let creatorId = myCreator?.id;
      if (!creatorId) {
        const { data: newCreator, error: ncErr } = await supabase.from('creators').insert({
          username: profile?.username || `user_${user.id.slice(0, 8)}`,
          display_name: profile?.display_name || '新创作者',
          avatar_color: profile?.avatar_color || '#f472b6',
          cover_color: '#831843',
          bio: profile?.bio || '',
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

      // BGM(可选)
      let bgmFinalUrl = bgmUrl;
      if (bgmFile) {
        setUploadProgress(50);
        bgmFinalUrl = await upload(bgmFile, 'bgm');
      }

      const tags = hashtags.split(/[,，\s]+/).filter((t) => t).map((t) => t.replace(/^#/, ''));
      const willLock = isCreator && isLocked;

      if (publishType === 'short') {
        // 短视频/图集
        let mediaUrl = '';
        let galleryJson: any = null;
        if (mediaType === 'video') {
          setUploadProgress(25);
          mediaUrl = await upload(videoFile!, 'videos');
        } else {
          const uploadedItems: { url: string; duration: number }[] = [];
          for (let i = 0; i < galleryItems.length; i++) {
            const item = galleryItems[i];
            const url = await upload(item.file, 'images');
            uploadedItems.push({ url, duration: item.duration });
            setUploadProgress(25 + (50 * (i + 1) / galleryItems.length));
          }
          galleryJson = uploadedItems;
        }

        setUploadProgress(90);
        const insertData: any = {
          creator_id: creatorId,
          type: mediaType === 'video' ? 'video' : 'gallery',
          caption,
          hashtags: tags,
          placeholder_color: '#000000',
          media_url: mediaType === 'video' ? mediaUrl : null,
          thumbnail_url: coverUrl || (mediaType === 'video' ? mediaUrl : null),
          cover_url: coverUrl || null,
          bgm_title: bgmTitle || null,
          bgm_artist: bgmArtist || null,
          bgm_url: bgmFinalUrl || null,
          images: mediaType === 'gallery' ? galleryJson : null,
          slide_duration: mediaType === 'gallery' ? galleryItems[0]?.duration || 3 : null,
          is_locked: willLock, is_locked: willLock,
          ppv_price: willLock ? ppvPrice : 0,
          is_pinned: isPinned,
          pinned_at: isPinned ? new Date().toISOString() : null,
          access: willLock ? 'ppv' : 'free',
          views: 0, likes: 0, comments: 0, shares: 0,
        };
        const { data: inserted, error: insertErr } = await supabase.from('shorts').insert(insertData).select().single();
        if (insertErr) throw insertErr;

        await supabase.from('creators').update({
          short_count: (myCreator?.short_count || 0) + 1
        }).eq('id', creatorId);

        setUploadProgress(100);
        router.push(`/post/${inserted.id}`);
      } else {
        // 帖子(动态)- 支持 video/gallery/纯文字
        let mediaUrl = '';
        let galleryJson: any = null;
        let postType = 'post';
        if (mediaType === 'video') {
          setUploadProgress(50);
          mediaUrl = await upload(videoFile!, 'videos');
          postType = 'video';
        } else if (mediaType === 'gallery') {
          const uploadedItems: { url: string; duration: number }[] = [];
          for (let i = 0; i < galleryItems.length; i++) {
            const item = galleryItems[i];
            const url = await upload(item.file, 'images');
            uploadedItems.push({ url, duration: item.duration });
            setUploadProgress(25 + (50 * (i + 1) / galleryItems.length));
          }
          galleryJson = uploadedItems;
          postType = 'gallery';
        }

        setUploadProgress(70);
        const { data: inserted, error: insertErr } = await supabase.from('posts').insert({
          creator_id: creatorId,
          type: postType,
          caption: postBody || caption,
          hashtags: tags,
          placeholder_color: '#000000',
          media_url: mediaUrl || null,
          images: galleryJson || [],
          slide_duration: galleryItems[0]?.duration || 3,
          bgm_title: bgmTitle || null,
          bgm_artist: bgmArtist || null,
          bgm_url: bgmFinalUrl || null,
          is_locked: willLock, is_locked: willLock,
          ppv_price: willLock ? ppvPrice : 0,
          is_pinned: isPinned,
          pinned_at: isPinned ? new Date().toISOString() : null,
          likes: 0, comments: 0,
        }).select().single();
        if (insertErr) throw insertErr;

        await supabase.from('creators').update({
          post_count: (myCreator?.post_count || 0) + 1
        }).eq('id', creatorId);

        setUploadProgress(100);
        router.push('/profile');
      }
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
        <p className="text-white/50 mb-6 text-sm">发布作品(进推荐流)或动态(仅关注者看)</p>

        {/* 大类型:作品 vs 帖子 */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button onClick={() => setPublishType('short')} className={`p-4 rounded-xl border transition ${publishType === 'short' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
            <VideoIcon className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm font-bold">作品</p>
            <p className="text-[10px] text-white/40">进入推荐流</p>
          </button>
          <button onClick={() => setPublishType('post')} className={`p-4 rounded-xl border transition ${publishType === 'post' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60 hover:bg-white/5'}`}>
            <FileText className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm font-bold">帖子 / 动态</p>
            <p className="text-[10px] text-white/40">关注者可见</p>
          </button>
        </div>

        {/* 封面图(仅作品) */}
        {publishType === 'short' && (
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2 text-white/80">
            作品封面
            <span className="text-white/40 text-xs ml-1">(独立上传,可裁切)</span>
          </label>
          {coverUrl ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
              <img src={coverUrl} className="w-full h-full object-cover" alt="cover" />
              <button onClick={() => setCoverUrl('')} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button onClick={() => coverInput.current?.click()} className="w-full aspect-video rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 hover:border-[#f472b6] transition">
              <ImageIcon className="w-6 h-6 text-white/40" />
              <p className="text-white/60 text-sm">点击上传封面</p>
            </button>
          )}
          <input ref={coverInput} type="file" accept="image/*" onChange={(e) => handleCoverSelect(e.target.files?.[0] || null)} className="hidden" />
        </div>
        )}

        {/* 媒体区 - 作品和帖子都可选择 */}
        {publishType === 'short' && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => { setMediaType('video'); setGalleryItems([]); }} className={`p-2 rounded-lg border text-sm transition ${mediaType === 'video' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60'}`}>
                视频
              </button>
              <button onClick={() => { setMediaType('gallery'); setVideoFile(null); }} className={`p-2 rounded-lg border text-sm transition ${mediaType === 'gallery' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60'}`}>
                图集
              </button>
            </div>
            {renderMediaUploader()}
          </>
        )}

        {/* 帖子也支持视频/图集 */}
        {publishType === 'post' && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button onClick={() => { setMediaType('post_text'); setVideoFile(null); setGalleryItems([]); }} className={`p-2 rounded-lg border text-xs transition ${mediaType === 'post_text' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60'}`}>
                纯文字
              </button>
              <button onClick={() => { setMediaType('video'); setGalleryItems([]); }} className={`p-2 rounded-lg border text-xs transition ${mediaType === 'video' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60'}`}>
                视频
              </button>
              <button onClick={() => { setMediaType('gallery'); setVideoFile(null); }} className={`p-2 rounded-lg border text-xs transition ${mediaType === 'gallery' ? 'border-[#f472b6] bg-[#f472b6]/10 text-white' : 'border-white/10 text-white/60'}`}>
                图集
              </button>
            </div>
            {mediaType !== 'post_text' && renderMediaUploader()}
          </>
        )}

        {/* 帖子的正文 */}
        {publishType === 'post' && (
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5 text-white/80">帖子内容</label>
            <textarea value={postBody} onChange={(e) => setPostBody(e.target.value)} rows={5} maxLength={2000} placeholder="分享点什么..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition resize-none" />
          </div>
        )}

        {/* 标题 */}
        <div className="mt-5">
          <label className="block text-sm font-medium mb-1.5 text-white/80">
            {publishType === 'post' ? '标题(短)' : '标题 / 描述'}
          </label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={publishType === 'post' ? 100 : 500} placeholder={publishType === 'post' ? '一句话标题' : '说点什么...'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition resize-none" />
        </div>

        {/* 标签 */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5 text-white/80">标签</label>
          <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="feet nailart aesthetic" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#f472b6] transition" />
        </div>

        {/* BGM */}
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
          {uploading ? '发布中...' : (publishType === 'short' ? '发布作品' : '发布帖子')}
        </button>
      </div>

      {/* 封面裁切弹窗 */}
      {cropSrc && cropTarget === 'cover' && (
        <ImageCropper
          src={cropSrc}
          shape="rect"
          ratio="16:9"
          onSave={onCropSave}
          onCancel={() => { setCropSrc(null); setCropTarget(null); }}
        />
      )}
    </div>
  );
}
