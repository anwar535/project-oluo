import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const clamp = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

type Gesture = {
  scale: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  distance: number;
};

export function PlanViewer({ src, alt, open, onClose }: { src: string; alt: string; open: boolean; onClose: () => void }) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const transformRef = useRef(transform);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const moved = useRef(false);
  const lastTap = useRef(0);
  transformRef.current = transform;

  useEffect(() => {
    if (!open) return;
    setTransform({ scale: 1, x: 0, y: 0 });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, src]);

  if (!open || typeof document === "undefined") return null;

  const update = (scale: number, x = 0, y = 0) => setTransform({ scale: clamp(scale), x, y });
  const zoomBy = (factor: number) => {
    const current = transformRef.current;
    const scale = clamp(current.scale * factor);
    const ratio = scale / current.scale;
    update(scale, current.x * ratio, current.y * ratio);
  };

  const beginGesture = () => {
    const points = [...pointers.current.values()];
    const current = transformRef.current;
    const first = points[0];
    if (!first) return;
    const second = points[1];
    gesture.current = {
      ...current,
      startX: first.x,
      startY: first.y,
      midX: second ? (first.x + second.x) / 2 : first.x,
      midY: second ? (first.y + second.y) / 2 : first.y,
      distance: second ? Math.hypot(first.x - second.x, first.y - second.y) : 0,
    };
    moved.current = false;
  };

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[100] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={alt} onTouchStart={(event) => event.stopPropagation()} onTouchEnd={(event) => event.stopPropagation()}>
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 bg-black/80 p-3" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))" }}>
        <button type="button" onClick={onClose} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/20 px-4 text-sm" aria-label="إغلاق المخطط"><X className="h-5 w-5" /> إغلاق</button>
        <div className="flex items-center gap-1" dir="ltr">
          <button type="button" onClick={() => zoomBy(0.75)} disabled={transform.scale <= MIN_SCALE} className="grid h-11 w-11 place-items-center rounded-lg border border-white/20 disabled:opacity-30" aria-label="تصغير"><Minus className="h-5 w-5" /></button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(transform.scale * 100)}%</span>
          <button type="button" onClick={() => zoomBy(1.33)} disabled={transform.scale >= MAX_SCALE} className="grid h-11 w-11 place-items-center rounded-lg border border-white/20 disabled:opacity-30" aria-label="تكبير"><Plus className="h-5 w-5" /></button>
          <button type="button" onClick={() => update(1)} className="grid h-11 w-11 place-items-center rounded-lg border border-white/20" aria-label="إعادة ضبط التكبير"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          beginGesture();
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const start = gesture.current;
          const rect = containerRef.current?.getBoundingClientRect();
          if (!start || !rect) return;
          const points = [...pointers.current.values()];
          const first = points[0];
          if (!first) return;
          const second = points[1];
          if (second && start.distance > 0) {
            const midX = (first.x + second.x) / 2;
            const midY = (first.y + second.y) / 2;
            const scale = clamp(start.scale * (distance(first, second) / start.distance));
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const contentX = (start.midX - cx - start.x) / start.scale;
            const contentY = (start.midY - cy - start.y) / start.scale;
            update(scale, midX - cx - contentX * scale, midY - cy - contentY * scale);
            moved.current = true;
          } else if (start.scale > 1) {
            const x = start.x + event.clientX - start.startX;
            const y = start.y + event.clientY - start.startY;
            if (Math.abs(event.clientX - start.startX) + Math.abs(event.clientY - start.startY) > 5) moved.current = true;
            update(start.scale, x, y);
          }
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          if (!moved.current && pointers.current.size === 0 && transformRef.current.scale === 1) {
            const now = Date.now();
            if (now - lastTap.current < 300) {
              update(2.5);
              lastTap.current = 0;
            } else lastTap.current = now;
          }
          if (pointers.current.size) beginGesture();
        }}
        onPointerCancel={(event) => { pointers.current.delete(event.pointerId); if (pointers.current.size) beginGesture(); }}
      >
        <img
          src={src}
          alt={alt}
          decoding="async"
          draggable={false}
          className="max-h-full max-w-full object-contain will-change-transform"
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}
        />
      </div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1.5 text-[11px] text-white/70" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>انقر مرتين أو استخدم إصبعين للتكبير، واسحب للتحريك</p>
    </div>,
    document.body,
  );
}
