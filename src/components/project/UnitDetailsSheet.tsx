import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BedDouble, Building2, ChevronLeft, ChevronRight, Layers3, MessageCircle, MoveHorizontal, Phone, Ruler, Scan, Share2, Video } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ProjectRow, UnitRow } from "@/lib/types";
import { PlanViewer } from "./PlanViewer";
import { StatusPill } from "./UnitsTable";
import { featureChips, isAreaCol, isBuiltAreaCol, isFeaturesCol, isFloorCol, isLengthsCol, isPriceCol, isPrivateAreaCol, isRoomsCol, isVideoCol, statusStyle } from "./unit-utils";

const UNIFIED_PHONE = "9200022287";
const toIntl = (phone: string) => phone.startsWith("0") ? `966${phone.slice(1)}` : phone.startsWith("966") ? phone : `966${phone}`;
const telHref = `tel:+${toIntl(UNIFIED_PHONE)}`;

function specIcon(label: string): LucideIcon {
  if (isPrivateAreaCol(label)) return Scan;
  if (isBuiltAreaCol(label)) return Building2;
  if (isAreaCol(label)) return Ruler;
  if (isFloorCol(label)) return Layers3;
  if (isRoomsCol(label)) return BedDouble;
  if (isLengthsCol(label)) return MoveHorizontal;
  return Ruler;
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

export function UnitDetailsSheet({ unit, units, columns, project, onClose, onNavigate }: {
  unit: UnitRow | null;
  units: UnitRow[];
  columns: string[];
  project: ProjectRow;
  onClose: () => void;
  onNavigate: (unit: UnitRow) => void;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const index = unit ? units.findIndex((item) => item.id === unit.id) : -1;
  const previous = index > 0 ? units[index - 1] : undefined;
  const next = index >= 0 && index < units.length - 1 ? units[index + 1] : undefined;

  useEffect(() => { setPlanOpen(false); setCopied(false); }, [unit?.id]);
  useEffect(() => {
    if (!unit || planOpen) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "ArrowRight" && previous) { event.preventDefault(); onNavigate(previous); }
      if (event.key === "ArrowLeft" && next) { event.preventDefault(); onNavigate(next); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unit, planOpen, previous, next, onNavigate]);

  const priceCol = columns.find(isPriceCol);
  const areaCol = columns.find(isAreaCol);
  const price = unit && priceCol && !statusStyle(unit.status).hidePrice ? unit.extra?.[priceCol] : "";
  const area = unit && areaCol ? unit.extra?.[areaCol] : "";
  const whatsappText = unit ? `السلام عليكم، أرغب بالاستفسار عن ${project.name} - وحدة رقم ${unit.unit_number}${area ? ` - المساحة: ${area}` : ""}${price ? ` - السعر: ${price} ريال` : ""}` : "";
  const whatsappHref = `https://wa.me/${toIntl(UNIFIED_PHONE)}?text=${encodeURIComponent(whatsappText)}`;
  const dataColumns = unit ? columns.filter((column) => !isPriceCol(column) && !isFeaturesCol(column) && !isVideoCol(column)) : [];
  const featureColumns = unit ? columns.filter((column) => isFeaturesCol(column) && (unit.extra?.[column] ?? "").trim()) : [];
  const videoColumn = unit ? columns.find((column) => isVideoCol(column) && (unit.extra?.[column] ?? "").trim()) : undefined;
  const videoUrl = unit && videoColumn ? unit.extra?.[videoColumn] : undefined;

  const share = async () => {
    if (!unit) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${project.name} - وحدة ${unit.unit_number}`, text: `تفاصيل الوحدة ${unit.unit_number} في ${project.name}`, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Sheet open={!!unit} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" dir="rtl" className="h-[94dvh] max-h-[94dvh] gap-0 overflow-hidden rounded-t-3xl p-0">
        {unit && (
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
            <SheetHeader className="shrink-0 space-y-2 px-5 pb-3 pt-5 text-right">
              <div className="flex items-center justify-between gap-3 pl-10">
                <div>
                  <SheetTitle className="text-xl">وحدة رقم {unit.unit_number}</SheetTitle>
                  <div className="mt-2"><StatusPill status={unit.status} /></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => previous && onNavigate(previous)} disabled={!previous} className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-2.5 text-xs disabled:opacity-30" aria-label="الوحدة السابقة"><ChevronRight className="h-4 w-4" /> السابق</button>
                  <button type="button" onClick={() => next && onNavigate(next)} disabled={!next} className="inline-flex h-10 items-center gap-1 rounded-lg border border-border px-2.5 text-xs disabled:opacity-30" aria-label="الوحدة التالية">التالي <ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={share} className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-lg border border-brand/30 px-2.5 text-xs text-brand" aria-label="مشاركة الوحدة"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">{copied ? "تم النسخ" : "مشاركة"}</span></button>
                </div>
              </div>
              <span className="sr-only" aria-live="polite">{copied ? "تم نسخ رابط الوحدة" : ""}</span>
            </SheetHeader>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-5 pb-6"
              onTouchStart={(event) => {
                const touch = event.touches[0];
                touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
              }}
              onTouchEnd={(event) => {
                const start = touchStart.current;
                const touch = event.changedTouches[0];
                touchStart.current = null;
                if (!start || !touch) return;
                const dx = touch.clientX - start.x;
                const dy = touch.clientY - start.y;
                if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                if (dx > 0 && previous) onNavigate(previous);
                if (dx < 0 && next) onNavigate(next);
              }}
            >
              {unit.plan_image && (
                <button type="button" onClick={() => setPlanOpen(true)} className="group relative mt-1 block w-full overflow-hidden rounded-2xl border border-border bg-white" aria-label="تكبير مخطط الوحدة">
                  <img src={unit.plan_image} alt={`مخطط الوحدة ${unit.unit_number}`} loading="lazy" decoding="async" className="max-h-[52vh] w-full object-contain" />
                  <span className="absolute bottom-3 left-3 rounded-full bg-navy/85 px-3 py-1.5 text-xs text-navy-foreground">اضغط للتكبير</span>
                </button>
              )}

              {videoUrl && (
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand/80 px-5 py-3 font-bold text-white shadow transition hover:opacity-95"><Video className="h-5 w-5" /> مشاهدة فيديو 3D للوحدة</a>
              )}

              <div className="mt-5 rounded-2xl border border-brand/30 bg-brand/10 p-4 text-center">
                <div className="text-xs text-muted-foreground">{priceCol ?? "السعر"}</div>
                <div className={`mt-1 text-3xl font-black tabular-nums ${price ? "text-brand" : "text-muted-foreground"}`}>{price || "—"}</div>
              </div>

              {dataColumns.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {dataColumns.map((column) => {
                    const Icon = specIcon(column);
                    return (
                      <div key={column} className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                        <Icon className="mx-auto mb-1.5 h-4 w-4 text-brand" />
                        <div className="text-[11px] text-muted-foreground">{column}</div>
                        <div className="mt-1 break-words text-sm font-bold">{unit.extra?.[column] || "—"}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {featureColumns.map((column) => (
                <div key={column} className="mt-5 border-t border-border pt-4">
                  <h3 className="mb-3 text-sm font-bold text-navy">{column}</h3>
                  <div className="flex flex-wrap gap-2">
                    {featureChips(unit.extra?.[column]).map((feature, featureIndex) => <span key={`${feature}-${featureIndex}`} className="rounded-full bg-secondary px-3 py-1.5 text-xs text-secondary-foreground">{feature}</span>)}
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-border bg-background/95 p-4 backdrop-blur-xl" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
              <div className="grid grid-cols-2 gap-2">
                <a href={telHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand/40 px-5 font-bold text-brand transition hover:bg-brand/10"><Phone className="h-5 w-5" /> اتصال</a>
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-100 px-5 font-bold text-emerald-700 transition hover:bg-emerald-200"><MessageCircle className="h-5 w-5" /> واتساب</a>
              </div>
            </div>
            {unit.plan_image && <PlanViewer src={unit.plan_image} alt={`مخطط الوحدة ${unit.unit_number}`} open={planOpen} onClose={() => setPlanOpen(false)} />}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
