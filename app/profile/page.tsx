'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Edit3, X, Check, Camera, Image as ImageIcon, Heart, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { TierEditor } from '@/components/creator/tier-editor';
import { supabase } from '@/lib/supabase';
import { CommentSection } from '@/components/shared/comment-section';

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

// ====== 图片裁剪组件 ======
// 设计:图片固定,裁剪框可拖动 + 8 个角控制点缩放
function ImageCropper({
  src,
  shape, // 'circle' | 'rect'
  ratio, // '1:1' | '16:9'
  onSave,
  onCancel,
}: {
  src: string;
  shape: 'circle' | 'rect';
  ratio: '1:1' | '16:9';
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 320, h: 320 });

  // 裁剪框状态(相对原图像素坐标)
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // 拖拽/缩放状态
  const [action, setAction] = useState<null | 'move' | 'nw' | 'ne' | 'sw' | 'se'>(null);
  const startRef = useRef<{ mx: number; my: number; crop: typeof crop } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 加载图片原始尺寸
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = src;
  }, [src]);

  // 计算容器最大尺寸 + 初始裁剪框
  useEffect(() => {
    const maxW = Math.min(window.innerWidth - 32, 480);
    const aspect = ratio === '1:1' ? 1 : 16 / 9;
    const h = ratio === '1:1' ? maxW : maxW / aspect;
    setContainerSize({ w: maxW, h });
  }, [ratio]);

  // 初始裁剪框:以图片中心为锚点,按比例填满短边
  useEffect(() => {
    if (imgSize.w === 0 || containerSize.w === 0) return;
    // 等比缩放图片到容器
    const scaleFit = Math.min(containerSize.w / imgSize.w, containerSize.h / imgSize.h);
    const dispW = imgSize.w * scaleFit;
    const dispH = imgSize.h * scaleFit;
    const offsetX = (containerSize.w - dispW) / 2;
    const offsetY = (containerSize.h - dispH) / 2;

    // 短边为裁剪框初始宽度
    const initDispSize = Math.min(dispW, dispH) * 0.8;

    // 初始裁剪框中心 = 图片中心
    const cropCenterDisp = { x: dispW / 2 + offsetX, y: dispH / 2 + offsetY };
    // 转换为原图坐标
    const cropCenterImg = {
      x: (cropCenterDisp.x - offsetX) / scaleFit,
      y: (cropCenterDisp.y - offsetY) / scaleFit,
    };
    const cropSizeImg = initDispSize / scaleFit;
    setCrop({
      x: Math.max(0, cropCenterImg.x - cropSizeImg / 2),
      y: Math.max(0, cropCenterImg.y - cropSizeImg / 2),
      w: Math.min(cropSizeImg, imgSize.w),
      h: cropSizeImg,
    });
  }, [imgSize, containerSize]);

  // 把裁剪框坐标(原图)转换为显示坐标(容器)
  const scaleFit = imgSize.w ? Math.min(containerSize.w / imgSize.w, containerSize.h / imgSize.h) : 1;
  const offsetX = imgSize.w ? (containerSize.w - imgSize.w * scaleFit) / 2 : 0;
  const offsetY = imgSize.h ? (containerSize.h - imgSize.h * scaleFit) / 2 : 0;
  const cropDisp = {
    x: crop.x * scaleFit + offsetX,
    y: crop.y * scaleFit + offsetY,
    w: crop.w * scaleFit,
    h: crop.h * scaleFit,
  };

  // 拖拽/缩放
  const startAction = (act: typeof action, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAction(act);
    startRef.current = { mx: e.clientX, my: e.clientY, crop: { ...crop } };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!action || !startRef.current) return;
    const dx = e.clientX - startRef.current.mx;
    const dy = e.clientY - startRef.current.my;
    // 显示像素 → 原图像素
    const dxImg = dx / scaleFit;
    const dyImg = dy / scaleFit;
    const start = startRef.current.crop;

    if (action === 'move') {
      setCrop({
        ...start,
        x: clamp(start.x + dxImg, 0, imgSize.w - start.w),
        y: clamp(start.y + dyImg, 0, imgSize.h - start.h),
      });
    } else {
      // 缩放 - 按形状保持比例
      const aspect = ratio === '1:1' ? 1 : start.w / start.h;
      let newX = start.x, newY = start.y, newW = start.w, newH = start.h;
      const deltaW = (action.includes('e') ? dxImg : action.includes('w') ? -dxImg : 0);
      const deltaH = (action.includes('s') ? dyImg : action.includes('n') ? -dyImg : 0);
      // 按主要方向缩放 + 按比例适配另一边
      if (action === 'nw' || action === 'se') {
        const delta = Math.abs(deltaW) > Math.abs(deltaH) ? deltaW : deltaH;
        newW = clamp(start.w + delta, 50, imgSize.w);
        newH = newW / aspect;
        if (action === 'nw') {
          newX = start.x + (start.w - newW);
          newY = start.y + (start.h - newH);
        }
      } else if (action === 'ne') {
        const delta = Math.abs(deltaW) > Math.abs(dyImg * aspect) ? deltaW : dyImg * aspect;
        newW = clamp(start.w + delta, 50, imgSize.w);
        newH = newW / aspect;
        newY = start.y + (start.h - newH);
      } else if (action === 'sw') {
        const delta = Math.abs(deltaW) > Math.abs(dyImg * aspect) ? deltaW : dyImg * aspect;
        newW = clamp(start.w + delta, 50, imgSize.w);
        newH = newW / aspect;
        newX = start.x + (start.w - newW);
      }
      // 限制边界
      newX = clamp(newX, 0, imgSize.w - 50);
      newY = clamp(newY, 0, imgSize.h - 50);
      newW = clamp(newW, 50, imgSize.w - newX);
      newH = clamp(newH, 50, imgSize.h - newY);
      setCrop({ x: newX, y: newY, w: newW, h: newH });
    }
  };
  const endAction = () => {
    setAction(null);
    startRef.current = null;
  };

  // 输出裁剪
  const handleSave = () => {
    const outputW = ratio === '1:1' ? 800 : 1280;
    const outputH = ratio === '1:1' ? 800 : 720;
    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      document.querySelector(`#crop-img-${shape}`) as HTMLImageElement,
      crop.x, crop.y, crop.w, crop.h,
      0, 0, outputW, outputH
    );
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center px-4">
      <div className="bg-zinc-900 rounded-2xl p-5 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{shape === 'circle' ? '调整头像' : '调整背景'}</h3>
          <button onClick={onCancel} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 容器:图片固定,裁剪框叠加 */}
        <div
          ref={containerRef}
          className="relative mx-auto bg-black overflow-hidden select-none"
          style={{ width: containerSize.w, height: containerSize.h }}
          onPointerMove={onPointerMove}
          onPointerUp={endAction}
          onPointerCancel={endAction}
        >
          {/* 原图 */}
          {imgSize.w > 0 && (
            <img
              id={`crop-img-${shape}`}
              src={src}
              alt=""
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                width: imgSize.w * scaleFit,
                height: imgSize.h * scaleFit,
                left: offsetX,
                top: offsetY,
              }}
            />
          )}

          {/* 暗色遮罩 - 框外区域 */}
          {imgSize.w > 0 && (
            <svg className="absolute inset-0 pointer-events-none" width={containerSize.w} height={containerSize.h}>
              <defs>
                <mask id={`mask-${shape}`}>
                  <rect width="100%" height="100%" fill="white" />
                  {shape === 'circle' ? (
                    <circle cx={cropDisp.x + cropDisp.w / 2} cy={cropDisp.y + cropDisp.h / 2} r={cropDisp.w / 2} fill="black" />
                  ) : (
                    <rect x={cropDisp.x} y={cropDisp.y} width={cropDisp.w} height={cropDisp.h} fill="black" />
                  )}
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask={`url(#mask-${shape})`} />
            </svg>
          )}

          {/* 裁剪框边框 */}
          {imgSize.w > 0 && (
            <div
              onPointerDown={(e) => startAction('move', e)}
              className="absolute cursor-move"
              style={{
                left: cropDisp.x,
                top: cropDisp.y,
                width: cropDisp.w,
                height: cropDisp.h,
                borderRadius: shape === 'circle' ? '50%' : 8,
                border: '2px solid #f472b6',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                touchAction: 'none',
              }}
            >
              {/* 网格线(三分法) */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
              </div>

              {/* 4 个角的控制点 */}
              {(['nw', 'ne', 'sw', 'se'] as const).map((pos) => {
                const style: React.CSSProperties = {
                  position: 'absolute',
                  width: 24, height: 24,
                  background: '#f472b6',
                  border: '2px solid white',
                  borderRadius: '50%',
                  touchAction: 'none',
                };
                if (pos === 'nw') { style.left = -12; style.top = -12; style.cursor = 'nwse-resize'; }
                if (pos === 'ne') { style.right = -12; style.top = -12; style.cursor = 'nesw-resize'; }
                if (pos === 'sw') { style.left = -12; style.bottom = -12; style.cursor = 'nesw-resize'; }
                if (pos === 'se') { style.right = -12; style.bottom = -12; style.cursor = 'nwse-resize'; }
                return (
                  <div
                    key={pos}
                    onPointerDown={(e) => startAction(pos, e)}
                    style={style}
                  />
                );
              })}
            </div>
          )}
        </div>

        <p className="text-white/40 text-xs text-center mt-3">
          拖动方框移动,拖角缩放
        </p>

        <div className="mt-4 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-white/15 text-white text-sm hover:bg-white/5">
            取消
          </button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#f472b6] to-[#db2777] text-white text-sm font-bold">
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const [myShorts, setMyShorts] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [myCreator, setMyCreator] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'works' | 'posts' | 'likes' | 'bookmarks'>('works');
  const [paidEnabled, setPaidEnabled] = useState(false);
  const [showTierEditor, setShowTierEditor] = useState(false);
  const [likedItems, setLikedItems] = useState<any[]>([]);
  const [likedPostItems, setLikedPostItems] = useState<any[]>([]);
  const [likeFilter, setLikeFilter] = useState<'works' | 'posts'>('works');
  const [bookmarkedItems, setBookmarkedItems] = useState<any[]>([]);
  // 帖子点赞状态
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikeCounts, setPostLikeCounts] = useState<Record<string, number>>({});
  const [postCommentCounts, setPostCommentCounts] = useState<Record<string, number>>({});
  // 作品网格计数
  const [workLikeCounts, setWorkLikeCounts] = useState<Record<string, number>>({});
  const [workCommentCounts, setWorkCommentCounts] = useState<Record<string, number>>({});
  // 帖子评论
  const [openPostComment, setOpenPostComment] = useState<string | null>(null);

  // 编辑表单
  const [eName, setEName] = useState('');
  const [eBio, setEBio] = useState('');
  const [eAvatar, setEAvatar] = useState('');
  const [eCover, setECover] = useState('');
  const [eAvatarUrl, setEAvatarUrl] = useState<string>('');
  const [eCoverUrl, setECoverUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // 待裁剪的临时 URL
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'avatar' | 'cover' | null>(null);

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    // 查创作者行(无论 is_creator,用户发布内容时自动创建)
    supabase.from('creators').select('*').eq('owner_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setMyCreator(data);
        setPaidEnabled(data.paid_enabled || false);
        // 作品
        supabase.from('shorts').select('*').eq('creator_id', data.id)
          .order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
          .then(({ data: s }) => {
            setMyShorts(s || []);
            // 加载作品真实点赞/评论数
            if (s && s.length > 0) {
              const ids = s.map(x => x.id);
              Promise.all([
                supabase.from('likes').select('short_id').in('short_id', ids),
                supabase.from('comments').select('short_id').in('short_id', ids),
              ]).then(([l, c]) => {
                const lc: Record<string, number> = {}; (l.data || []).forEach(x => { lc[x.short_id] = (lc[x.short_id]||0)+1; });
                const cc: Record<string, number> = {}; (c.data || []).forEach(x => { cc[x.short_id] = (cc[x.short_id]||0)+1; });
                setWorkLikeCounts(lc); setWorkCommentCounts(cc);
              });
            }
          });
        // 帖子
        supabase.from('posts').select('*').eq('creator_id', data.id)
          .order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
          .then(({ data: p }) => {
            setMyPosts(p || []);
            // 加载帖子真实点赞/评论数
            if (p && p.length > 0) {
              const ids = p.map(x => x.id);
              Promise.all([
                supabase.from('likes').select('post_id').in('post_id', ids),
                supabase.from('comments').select('post_id').in('post_id', ids),
              ]).then(([l, c]) => {
                const lc: Record<string, number> = {}; (l.data || []).forEach((x: any) => { lc[x.post_id] = (lc[x.post_id] || 0) + 1; });
                const cc: Record<string, number> = {}; (c.data || []).forEach((x: any) => { cc[x.post_id] = (cc[x.post_id] || 0) + 1; });
                setPostLikeCounts(lc); setPostCommentCounts(cc);
              });
            }
          });
      });
    // 喜欢的作品(短视频)
    supabase.from('likes').select('short_id, created_at').eq('user_id', user.id).not('short_id', 'is', null).order('created_at', { ascending: false }).limit(50)
      .then(async ({ data: likes }) => {
        if (!likes || likes.length === 0) { setLikedItems([]); } else {
          const ids = likes.map(l => l.short_id);
          const { data: shorts } = await supabase.from('shorts').select('*').in('id', ids);
          const shortMap: Record<string, any> = {}; (shorts || []).forEach(s => { shortMap[s.id] = s; });
          setLikedItems(likes.map(l => shortMap[l.short_id]).filter(Boolean));
        }
      });
    // 喜欢的帖子
    supabase.from('likes').select('post_id, created_at').eq('user_id', user.id).not('post_id', 'is', null).order('created_at', { ascending: false }).limit(50)
      .then(async ({ data: likes }) => {
        if (!likes || likes.length === 0) { setLikedPostItems([]); } else {
          const ids = likes.map(l => l.post_id);
          const { data: posts } = await supabase.from('posts').select('*').in('id', ids);
          const map: Record<string, any> = {}; (posts || []).forEach(p => { map[p.id] = p; });
          setLikedPostItems(likes.map(l => map[l.post_id]).filter(Boolean));
        }
      });
    // 收藏的作品
    supabase.from('bookmarks').select('short_id, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      .then(async ({ data: bm }) => {
        if (!bm || bm.length === 0) return setBookmarkedItems([]);
        const ids = bm.map(b => b.short_id);
        const { data: shorts } = await supabase.from('shorts').select('*').in('id', ids);
        const shortMap: Record<string, any> = {}; (shorts || []).forEach(s => { shortMap[s.id] = s; });
        setBookmarkedItems(bm.map(b => shortMap[b.short_id]).filter(Boolean));
      });
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

  // 选中文件后进入裁剪
  const onAvatarSelect = (f: File | null) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setCropSrc(url);
    setCropTarget('avatar');
  };
  const onCoverSelect = (f: File | null) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setCropSrc(url);
    setCropTarget('cover');
  };

  // 裁剪确认 → 上传
  const onCropSave = async (blob: Blob) => {
    if (!cropTarget) return;
    const bucket = cropTarget === 'avatar' ? 'avatars' : 'covers';
    const ext = cropTarget === 'avatar' ? 'jpg' : 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true });
    if (error) {
      alert('上传失败: ' + error.message);
      setCropSrc(null);
      setCropTarget(null);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    if (cropTarget === 'avatar') setEAvatarUrl(publicUrl);
    else setECoverUrl(publicUrl);
    setCropSrc(null);
    setCropTarget(null);
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

  const togglePostLike = async (postId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    const next = new Set(likedPosts);
    const isLiking = !next.has(postId);
    if (isLiking) {
      next.add(postId);
      await supabase.from('likes').insert({ user_id: user.id, post_id: postId });
    } else {
      next.delete(postId);
      await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
    }
    setLikedPosts(next);
    setPostLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + (isLiking ? 1 : -1) }));
  };

  const togglePostComments = (postId: string) => {
    if (!user) { window.location.href = '/login'; return; }
    setOpenPostComment(openPostComment === postId ? null : postId);

  const togglePaid = async () => {
    if (!myCreator) return;
    const next = !paidEnabled;
    setPaidEnabled(next);
    await supabase.from("creators").update({ paid_enabled: next }).eq("id", myCreator.id);
    if (next) setShowTierEditor(true);
  };
  };

  const renderAvatar = (size: number, url?: string | null, color?: string, name?: string) => {
    const s = { width: size, height: size };
    if (url) return <img src={url} style={s} className="rounded-full object-cover" alt="" />;
    return (
      <div style={{ ...s, background: color }} className="rounded-full flex items-center justify-center text-white font-bold">
        {name?.[0]?.toUpperCase() || '?'}
      </div>
    );
  };

  return (
    <div className="pb-12 bg-black">
      {/* 封面 */}
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <button
          onClick={() => setEditing(true)}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-sm hover:bg-black/70 transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
          编辑资料
        </button>
      </div>

      {/* 头像 */}
      <div className="px-4 -mt-14 relative z-10">
        <div className="flex items-end justify-between">
          <div className="rounded-full p-1 bg-black">
            {renderAvatar(112, profile.avatar_url, profile.avatar_color, profile.display_name)}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{profile.display_name}</h2>
            <span className="text-[#f472b6] text-sm">✓</span>
            <div className="flex items-center gap-1.5 ml-2"><span className="text-xs text-white/40">付费</span><button onClick={() => togglePaid()} className={`relative w-9 h-5 rounded-full transition ${paidEnabled ? "bg-[#f472b6]" : "bg-white/20"}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${paidEnabled ? "left-4" : "left-0.5"}`} /></button></div>
          </div>
          <p className="text-white/50 mt-0.5">@{profile.username}</p>
        </div>

        {profile.bio && <p className="mt-3 text-white/80 text-[15px] leading-relaxed">{profile.bio}</p>}

        <div className="mt-5 flex gap-6 text-center">
          <div><p className="text-xl font-bold">{myShorts.length}</p><p className="text-white/50 text-xs mt-0.5">作品</p></div>
          <div><p className="text-xl font-bold">{myCreator?.subscriber_count || 0}</p><p className="text-white/50 text-xs mt-0.5">订阅者</p></div>
          <div><p className="text-xl font-bold">{totalLikes.toLocaleString()}</p><p className="text-white/50 text-xs mt-0.5">获赞</p></div>
          <div><p className="text-xl font-bold">{totalViews.toLocaleString()}</p><p className="text-white/50 text-xs mt-0.5">播放</p></div>
        </div>

        <div className="mt-6 border-b border-white/10 flex">
          {(['works', 'posts', 'likes', 'bookmarks'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-bold relative ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white/80'}`}>
              {{works: '作品', posts: '帖子', likes: '喜欢', bookmarks: '收藏'}[tab]}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f472b6] rounded-full" />}
            </button>
          ))}
        </div>

        <div className="mt-2">
          {(() => {
            // 喜欢 tab 有子分类
            if (activeTab === 'likes') {
              const items = likeFilter === 'works' ? likedItems : likedPostItems;
              const isFeed = likeFilter === 'posts'; // 帖子用 feed 样式
              return (
                <>
                  <div className="flex gap-2 px-4 pt-3 pb-2">
                    <button onClick={() => setLikeFilter('works')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${likeFilter === 'works' ? 'bg-[#f472b6] text-white' : 'bg-white/5 text-white/60'}`}>短视频</button>
                    <button onClick={() => setLikeFilter('posts')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${likeFilter === 'posts' ? 'bg-[#f472b6] text-white' : 'bg-white/5 text-white/60'}`}>帖子</button>
                  </div>
                  {items.length === 0 ? <p className="text-white/30 text-sm text-center py-12">{likeFilter === 'works' ? '还没有喜欢任何作品' : '还没有喜欢任何帖子'}</p> :
                    isFeed ? (
                      <div className="divide-y divide-white/5">{items.map(p => (<div key={p.id} className="p-4"><p className="text-sm mb-2">{p.caption}</p>{p.hashtags?.length>0 && <p className="text-[#f472b6] text-xs mb-2">{p.hashtags.map((h:string) => '#'+h).join(' ')}</p>}{p.media_url && (p.type==='video' ? <video src={p.media_url} className="w-full max-h-60 object-contain rounded-xl" controls preload="metadata" /> : <img src={p.media_url} className="w-full max-h-60 object-contain rounded-xl" alt="" />)}<div className="flex items-center justify-between mt-2"><span className="text-white/40 text-xs">{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</span><Link href={`/post/${p.id}`} className="text-[#f472b6] text-xs font-bold hover:underline">查看详情 →</Link></div></div>))}</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-0.5">{items.map(s => { const cv = s.cover_url || s.thumbnail_url || (s.images?.[0]?.url) || s.media_url; return <Link key={s.id} href={`/post/${s.id}`} className="aspect-[3/4] overflow-hidden bg-black">{cv ? (s.type==='video'&&!s.cover_url&&!s.thumbnail_url ? <video src={cv} className="w-full h-full object-cover" muted /> : <img src={cv} className="w-full h-full object-cover" alt="" />) : <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">无媒体</div>}</Link>; })}</div>
                    )}
                </>
              );
            }

            const items = activeTab === 'works' ? myShorts : activeTab === 'posts' ? myPosts : bookmarkedItems;
            const isEmpty = items.length === 0;
            const emptyMsg = {works: '还没有发布作品', posts: '还没有发布帖子', likes: '还没有喜欢任何作品', bookmarks: '还没有收藏任何作品'}[activeTab];

            if (isEmpty) return <p className="text-white/30 text-sm text-center py-12">{emptyMsg}</p>;

            // 帖子用 feed 样式,其余用封面网格
            if (activeTab === 'posts') {
              return (
                <div className="divide-y divide-white/5">
                  {items.map((p: any) => (
                    <div key={p.id} className="p-4">
                      <p className="text-sm whitespace-pre-wrap mb-3">{p.caption}</p>
                      {p.hashtags?.length > 0 && <p className="text-[#f472b6] text-xs mb-2">{p.hashtags.map((h: string) => `#${h}`).join(' ')}</p>}
                      {p.media_url && (
                        <div className="rounded-xl overflow-hidden bg-black mb-3">
                          {p.type === 'video' ? (
                            <video src={p.media_url} className="w-full max-h-80 object-contain" controls preload="metadata" />
                          ) : (
                            <img src={p.media_url} className="w-full max-h-80 object-contain" alt="" />
                          )}
                        </div>
                      )}
                      {/* 图集 */}
                      {p.images?.length > 0 && !p.media_url && (
                        <div className="grid grid-cols-2 gap-1 mb-3 rounded-xl overflow-hidden">
                          {p.images.map((img: any, i: number) => (
                            <img key={i} src={img.url} className="w-full max-h-40 object-contain bg-black" alt="" />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-white/40 text-xs">
                        <button onClick={() => togglePostLike(p.id)} className="flex items-center gap-1 hover:text-white">
                          <Heart className={`w-3.5 h-3.5 ${likedPosts.has(p.id) ? 'fill-[#f472b6] text-[#f472b6]' : ''}`} />
                          <span>{postLikeCounts[p.id] || 0}</span>
                        </button>
                        <button onClick={() => togglePostComments(p.id)} className="flex items-center gap-1 hover:text-white">
                          <MessageCircle className={`w-3.5 h-3.5 ${openPostComment === p.id ? 'text-[#f472b6]' : ''}`} />
                          {postCommentCounts[p.id] || 0}
                        </button>
                        <span>{p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}</span>
                        <Link href={`/post/${p.id}`} className="ml-auto text-[#f472b6] text-xs font-bold hover:underline">查看详情 →</Link>
                      </div>
                      {/* 评论区 */}
                      {openPostComment === p.id && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          <CommentSection targetId={p.id} fk="post_id" userId={user?.id} onCountChange={(d) => setPostCommentCounts(prev => ({ ...prev, [p.id]: (prev[p.id]||0) + d }))} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-3 gap-0.5">
                {items.map((s: any) => {
                  const coverUrl = s.cover_url || s.thumbnail_url || (s.images?.[0]?.url) || s.media_url;
                  return (
                    <Link key={s.id} href={`/post/${s.id}`} className="aspect-[3/4] relative overflow-hidden bg-black group">
                      {coverUrl ? (
                        s.type === 'video' && !s.cover_url && !s.thumbnail_url ? (
                          <video src={coverUrl} className="w-full h-full object-cover" muted />
                        ) : (
                          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs bg-black">无媒体</div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <div className="flex items-center gap-2 text-white text-[10px]">
                          <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{workLikeCounts[s.id] || 0}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{workCommentCounts[s.id] || 0}</span>
                        </div>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] flex items-center gap-0.5">
                        {s.type === 'video' ? '▶' : '🖼'} {(s.views || 0).toLocaleString()}
                      </div>
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 付费档位编辑弹窗 */}
      {showTierEditor && myCreator && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setShowTierEditor(false)}>
          <div className="min-h-screen flex items-start justify-center px-4 py-8">
            <div className="bg-zinc-900 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold">编辑订阅档位</h3><button onClick={() => setShowTierEditor(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button></div>
              <TierEditor creatorId={myCreator.id} onSaved={() => setShowTierEditor(false)} />
            </div>
          </div>
        </div>
      )}
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

              {/* 头像 */}
              <div className="mb-5">
                <label className="block text-sm text-white/70 mb-2">头像</label>
                <div className="flex items-center gap-4">
                  <div className="rounded-full p-1 bg-black shrink-0">
                    {renderAvatar(64, eAvatarUrl, eAvatar, eName)}
                  </div>
                  <button
                    onClick={() => avatarInput.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 text-white text-sm hover:bg-white/5 transition"
                  >
                    <Camera className="w-4 h-4" />
                    上传图片
                  </button>
                  {eAvatarUrl && (
                    <button onClick={() => setEAvatarUrl('')} className="px-3 py-2.5 rounded-xl text-white/50 text-sm hover:text-white">
                      移除
                    </button>
                  )}
                </div>
                <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarSelect(e.target.files?.[0] || null)} />
                <p className="text-white/40 text-xs mt-2">或选择纯色头像:</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => { setEAvatar(c); setEAvatarUrl(''); }} className={`w-8 h-8 rounded-full transition ${eAvatar === c && !eAvatarUrl ? 'ring-2 ring-white scale-110' : ''}`} style={{ background: c }} />
                  ))}
                </div>
              </div>

              {/* 背景 */}
              <div className="mb-5">
                <label className="block text-sm text-white/70 mb-2">主页背景</label>
                <button
                  onClick={() => coverInput.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/20 text-white/70 text-sm hover:border-[#f472b6] hover:text-white transition"
                >
                  <ImageIcon className="w-4 h-4" />
                  上传背景图片(可调整大小位置)
                </button>
                <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={(e) => onCoverSelect(e.target.files?.[0] || null)} />
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

      {/* 裁剪弹窗 */}
      {cropSrc && cropTarget && (
        <ImageCropper
          src={cropSrc}
          shape={cropTarget === 'avatar' ? 'circle' : 'rect'}
          ratio={cropTarget === 'avatar' ? '1:1' : '16:9'}
          onSave={onCropSave}
          onCancel={() => { setCropSrc(null); setCropTarget(null); }}
        />
      )}
    </div>
  );
}
