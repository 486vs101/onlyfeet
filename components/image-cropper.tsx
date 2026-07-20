'use client';

import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';

type Shape = 'circle' | 'rect';
type Ratio = '1:1' | '16:9' | '3:4';

type Props = {
  src: string;
  shape: Shape;
  ratio: Ratio;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function ImageCropper({ src, shape, ratio, onSave, onCancel }: Props) {
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 320, h: 320 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [action, setAction] = useState<null | 'move' | 'nw' | 'ne' | 'sw' | 'se'>(null);
  const startRef = useRef<{ mx: number; my: number; crop: typeof crop } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  useEffect(() => {
    const maxW = Math.min(window.innerWidth - 32, 480);
    let h: number;
    if (ratio === '1:1') h = maxW;
    else if (ratio === '16:9') h = maxW / (16 / 9);
    else h = maxW / (3 / 4);
    setContainerSize({ w: maxW, h });
  }, [ratio]);

  useEffect(() => {
    if (imgSize.w === 0 || containerSize.w === 0) return;
    const scaleFit = Math.min(containerSize.w / imgSize.w, containerSize.h / imgSize.h);
    const dispW = imgSize.w * scaleFit;
    const dispH = imgSize.h * scaleFit;
    const offsetX = (containerSize.w - dispW) / 2;
    const offsetY = (containerSize.h - dispH) / 2;
    const initDispSize = Math.min(dispW, dispH) * 0.8;
    const cropCenterDisp = { x: dispW / 2 + offsetX, y: dispH / 2 + offsetY };
    const cropCenterImg = {
      x: (cropCenterDisp.x - offsetX) / scaleFit,
      y: (cropCenterDisp.y - offsetY) / scaleFit,
    };
    const cropSizeImg = initDispSize / scaleFit;
    const aspect = ratio === '1:1' ? 1 : ratio === '16:9' ? 16 / 9 : 3 / 4;
    setCrop({
      x: Math.max(0, cropCenterImg.x - cropSizeImg / 2),
      y: Math.max(0, cropCenterImg.y - cropSizeImg / 2),
      w: Math.min(cropSizeImg, imgSize.w),
      h: Math.min(cropSizeImg / aspect, imgSize.h),
    });
  }, [imgSize, containerSize, ratio]);

  const scaleFit = imgSize.w ? Math.min(containerSize.w / imgSize.w, containerSize.h / imgSize.h) : 1;
  const offsetX = imgSize.w ? (containerSize.w - imgSize.w * scaleFit) / 2 : 0;
  const offsetY = imgSize.h ? (containerSize.h - imgSize.h * scaleFit) / 2 : 0;
  const cropDisp = {
    x: crop.x * scaleFit + offsetX,
    y: crop.y * scaleFit + offsetY,
    w: crop.w * scaleFit,
    h: crop.h * scaleFit,
  };

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
    const dxImg = dx / scaleFit;
    const dyImg = dy / scaleFit;
    const start = startRef.current.crop;
    const aspect = ratio === '1:1' ? 1 : ratio === '16:9' ? 16 / 9 : 3 / 4;

    if (action === 'move') {
      setCrop({
        ...start,
        x: clamp(start.x + dxImg, 0, imgSize.w - start.w),
        y: clamp(start.y + dyImg, 0, imgSize.h - start.h),
      });
    } else {
      let newX = start.x, newY = start.y, newW = start.w, newH = start.h;
      const deltaW = (action.includes('e') ? dxImg : action.includes('w') ? -dxImg : 0);
      const deltaH = (action.includes('s') ? dyImg : action.includes('n') ? -dyImg : 0);
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

  const handleSave = () => {
    const aspect = ratio === '1:1' ? 1 : ratio === '16:9' ? 16 / 9 : 3 / 4;
    const outputW = ratio === '1:1' ? 800 : ratio === '16:9' ? 1280 : 720;
    const outputH = Math.round(outputW / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(
      imgRef.current!,
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
          <h3 className="text-lg font-bold">调整图片</h3>
          <button onClick={onCancel} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto bg-black overflow-hidden select-none"
          style={{ width: containerSize.w, height: containerSize.h }}
          onPointerMove={onPointerMove}
          onPointerUp={endAction}
          onPointerCancel={endAction}
        >
          {imgSize.w > 0 && (
            <img
              ref={imgRef}
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

          {imgSize.w > 0 && (
            <svg className="absolute inset-0 pointer-events-none" width={containerSize.w} height={containerSize.h}>
              <defs>
                <mask id={`mask-crop-${shape}`}>
                  <rect width="100%" height="100%" fill="white" />
                  {shape === 'circle' ? (
                    <circle cx={cropDisp.x + cropDisp.w / 2} cy={cropDisp.y + cropDisp.h / 2} r={cropDisp.w / 2} fill="black" />
                  ) : (
                    <rect x={cropDisp.x} y={cropDisp.y} width={cropDisp.w} height={cropDisp.h} fill="black" />
                  )}
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask={`url(#mask-crop-${shape})`} />
            </svg>
          )}

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
                touchAction: 'none',
              }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
              </div>

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
                  <div key={pos} onPointerDown={(e) => startAction(pos, e)} style={style} />
                );
              })}
            </div>
          )}
        </div>

        <p className="text-white/40 text-xs text-center mt-3">拖动方框移动,拖角缩放</p>

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
