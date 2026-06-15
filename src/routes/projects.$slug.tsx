import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { List, LayoutGrid, Phone, MessageCircle, Video } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ProjectRow, UnitRow } from "@/lib/types";
import logo from "@/assets/logo.png";

// Active style for the status filter buttons — mirrors the in-table StatusPill colors
function statusBtnActive(status: string) {
  switch (status) {
    case "متاح":
      return "bg-emerald-100 text-emerald-700 border-emerald-500";
    case "محجوز":
      return "bg-amber-100 text-amber-700 border-amber-500";
    case "مباع":
      return "bg-stone-200 text-stone-700 border-red-500";
    case "غير متاح":
      return "bg-stone-100 text-stone-600 border-gray-400";
    case "كل الحالات":
    default:
      return "bg-navy text-navy-foreground border-navy";
  }
}


// Status-driven visual treatment for a unit row/card
function statusStyle(status: string) {
  switch (status) {
    case "متاح":
      return { border: "border-emerald-500", overlay: "", hidePrice: false };
    case "محجوز":
      return { border: "border-amber-500", overlay: "bg-amber-500/10", hidePrice: false };
    case "مباع":
      return { border: "border-red-500", overlay: "bg-red-500/10", hidePrice: false };
    case "غير متاح":
    default:
      return { border: "border-gray-400", overlay: "bg-gray-500/10", hidePrice: false };
  }
}

export const Route = createFileRoute("/projects/$slug")({
  component: ProjectPage,
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { project: data as ProjectRow };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.project.name} | علو العقارية` },
      {
        name: "description",
        content: `${loaderData?.project.tagline ?? ""} — ${loaderData?.project.district ?? ""}`,
      },
      { property: "og:image", content: loaderData?.project.cover_image ?? "" },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">المشروع غير موجود.</p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-destructive">{String(error)}</div>
  ),
});

const STATUS_OPTS = ["كل الحالات", "متاح", "محجوز", "مباع", "غير متاح"] as const;
const CONTACT_PHONES = ["0570020095", "0570020093", "0554745500"];
const UNIFIED_PHONE = "9200022287";


// Normalize a local Saudi number (05XXXXXXXX) to international form 9665XXXXXXXX (no plus, no leading 0)
function toIntl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return "966" + digits.slice(1);
  return "966" + digits;
}
function telHref(phone: string) {
  return `tel:+${toIntl(phone)}`;
}
function waHref(phone: string, text?: string) {
  const base = `https://wa.me/${toIntl(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

// Heuristics for special-styled columns (highlight price, etc.)
function isPriceCol(label: string) {
  return /سعر|price/i.test(label);
}
function isFeaturesCol(label: string) {
  return /مميزات|ميزة|ملاحظ|features|notes/i.test(label);
}
function isVideoCol(label: string) {
  return /فيديو|video|3d/i.test(label);
}
function isAreaCol(label: string) {
  return /مساحة|area/i.test(label) && !/مبنية|built|جزء/i.test(label);
}


function ProjectPage() {
  const { project } = Route.useLoaderData();
  const columns = project.columns ?? [];
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTS)[number]>("كل الحالات");
  const [search_, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [active, setActive] = useState<UnitRow | null>(null);
  const isMobile = useIsMobile();


  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units", project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("project_id", project.id)
        .order("sort_order");
      if (error) throw error;
      return data as UnitRow[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const visible = useMemo(
    () =>
      units.filter((u) => {
        if (statusFilter !== "كل الحالات" && u.status !== statusFilter) return false;
        if (search_) {
          const hay = `${u.unit_number} ${Object.values(u.extra ?? {}).join(" ")}`.toLowerCase();
          if (!hay.includes(search_.toLowerCase())) return false;
        }
        return true;
      }),
    [units, statusFilter, search_],
  );

  const counts = useMemo(
    () => ({
      total: units.length,
      available: units.filter((u) => u.status === "متاح").length,
      reserved: units.filter((u) => u.status === "محجوز").length,
      sold: units.filter((u) => u.status === "مباع").length,
    }),
    [units],
  );

  // Title block
  const primaryTitle = /^مشروع/.test(project.name)
    ? project.name
    : `مشروع ${project.name}`;
  const complexLabel =
    project.category === "Villas" ? "مجمع فلل فاخرة" : "مجمع شقق سكنية فاخرة";
  const districtLine = (() => {
    const d = (project.district ?? "").trim();
    if (!d) return "الرياض";
    let s = d;
    if (!/^حي\s/.test(s)) s = `حي ${s}`;
    if (!/الرياض\s*$/.test(s)) s = `${s} - الرياض`;
    return s;
  })();

  // Columns visible in tables/cards — video links are hidden everywhere except the unit dialog
  const publicColumns = useMemo(
    () => columns.filter((c: string) => !isVideoCol(c)),
    [columns],
  );


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 1. Hero: cover image filling width, blended into a black gradient with titles overlaid */}
      <header className="relative w-full bg-black text-white overflow-hidden group">
        {project.cover_image && (
          <img
            src={project.cover_image}
            alt={project.name}
            className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-[600ms] ease-out group-hover:scale-105"
          />
        )}
        {/* Dark gradient overlay so titles remain readable and image blends into the black */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black pointer-events-none" />
        {/* Oluo logo top-left, white */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 inline-flex items-center animate-fade-in-up pointer-events-none select-none" style={{ animationDelay: "0s" }}>
          <img
            src={logo}
            alt="علو"
            className="h-10 md:h-12 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
            draggable={false}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-28 md:pb-20 text-center min-h-[58vh] md:min-h-[70vh] flex flex-col justify-end">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
            {primaryTitle}
          </h1>
          <p className="mt-3 text-base md:text-lg font-semibold text-brand drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {complexLabel}
          </p>
          <p className="mt-1 text-sm md:text-base text-brand/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            {districtLine}
          </p>
        </div>
      </header>




      {/* Filters: units count + status as a horizontal button group (auto-filtering) */}
      <section className="mx-auto max-w-7xl px-6 mt-8">
        {units.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 h-11 px-4 rounded-lg border border-brand/30 bg-brand/10 text-sm">
                <span className="text-muted-foreground">عدد الوحدات</span>
                <span className="text-brand font-bold text-base">{visible.length}</span>
                {visible.length !== counts.total && (
                  <span className="text-[11px] text-muted-foreground">/ {counts.total}</span>
                )}
              </div>
              <div className="inline-flex rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setView("table")}
                  aria-label="عرض الجدول"
                  title="عرض الجدول"
                  className={`px-4 h-11 inline-flex items-center justify-center transition ${
                    view === "table" ? "bg-navy text-navy-foreground" : "hover:bg-muted"
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setView("grid")}
                  aria-label="عرض الشبكة"
                  title="عرض الشبكة"
                  className={`px-4 h-11 inline-flex items-center justify-center transition ${
                    view === "grid" ? "bg-navy text-navy-foreground" : "hover:bg-muted"
                  }`}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* Status as full button group (no dropdown) — colors mirror the in-table status pills */}
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTS.map((f) => {
                const active = statusFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-4 h-10 rounded-full text-sm font-medium border transition ${
                      active
                        ? `${statusBtnActive(f)} shadow-sm`
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>


      <main className="mx-auto max-w-7xl px-2 sm:px-6 pb-24 mt-6 animate-fade-in-up">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">جاري التحميل...</p>
        ) : units.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            لا توجد وحدات معروضة حالياً لهذا المشروع.
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">
            لا توجد وحدات مطابقة للبحث.
          </div>
        ) : view === "table" ? (
          isMobile ? (
            <MobileUnitsTable units={visible} columns={publicColumns} onOpen={setActive} />
          ) : (
            <UnitsTable units={visible} columns={publicColumns} onOpen={setActive} />
          )
        ) : (
          <div className="flex flex-col gap-4 w-full">
            {visible.map((u, i) => (
              <div key={u.id} className="animate-slide-in-right w-full" style={{ animationDelay: `${i * 0.05}s` }}>
                <UnitCard unit={u} columns={publicColumns} onClick={() => setActive(u)} />
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Mandatory disclaimer notes — soft gold, right-aligned */}
      <section className="mx-auto max-w-7xl px-6 animate-fade-in-up">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-xs sm:text-sm leading-7 text-amber-900 text-right">
          • تسري الأسعار حتى تاريخ 2026/07/31.<br />
          • جميع المعلومات المذكورة تقديرية، والمعتمد هي البيانات الواردة في الوثائق الصادرة من الجهات الرسمية.
        </div>
      </section>

      {/* Contact — unified number + reservation numbers, each on its own balanced row */}
      <section id="contact" className="bg-muted/40 border-t border-border mt-10 animate-fade-in-up">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <h2 className="text-center text-xl font-bold text-navy">تواصل معنا</h2>
          <div className="mx-auto mt-2 mb-6 h-0.5 w-16 bg-brand rounded-full" />
          <div className="space-y-3">
            <ContactRow
              label="الرقم الموحد"
              phone={UNIFIED_PHONE}
              waText={`السلام عليكم، أرغب بالاستفسار عن ${project.name}`}
              highlight
            />
            {CONTACT_PHONES.map((p, idx) => (
              <ContactRow
                key={p}
                label={idx === 0 ? "للحجز والاستفسار" : "\u00A0"}
                phone={p}
                waText={`السلام عليكم، أرغب بالاستفسار عن ${project.name}`}
              />
            ))}
          </div>
        </div>
      </section>



      <UnitDialog
        unit={active}
        columns={columns}
        onClose={() => setActive(null)}
        project={project}
      />
    </div>
  );
}


function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "amber" | "stone";
}) {
  const colors: Record<string, string> = {
    default: "text-foreground",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    stone: "text-stone-600",
  };
  return (
    <span>
      <span className="text-muted-foreground">{label}: </span>
      <span className={`font-bold ${colors[tone]}`}>{value}</span>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "متاح"
      ? "bg-emerald-100 text-emerald-700"
      : status === "محجوز"
        ? "bg-amber-100 text-amber-700"
        : status === "مباع"
          ? "bg-stone-200 text-stone-700"
          : "bg-stone-100 text-stone-600";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs ${cls}`}>
      {status}
    </span>
  );
}

function UnitsTable({
  units,
  columns,
  onOpen,
}: {
  units: UnitRow[];
  columns: string[];
  onOpen: (u: UnitRow) => void;
}) {
  return (
    <div
      className="overflow-x-auto -mx-6 px-2 sm:mx-0 sm:px-0"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y pinch-zoom" }}
    >
      <table
        className="text-[11px] sm:text-sm text-right border-separate w-full table-fixed sm:table-auto"
        style={{ borderSpacing: "0 8px" }}
      >


        <thead className="text-muted-foreground">
          <tr>
            <th className="px-1.5 sm:px-4 py-2 font-medium whitespace-nowrap">رقم الوحدة</th>
            {columns.map((c) => (
              <th
                key={c}
                className={`px-1.5 sm:px-4 py-2 font-medium ${isFeaturesCol(c) ? "hidden md:table-cell" : ""}`}
              >
                {c}
              </th>
            ))}
            <th className="px-1.5 sm:px-4 py-2 font-medium">الحالة</th>
            <th className="px-1.5 sm:px-4 py-2 font-medium hidden sm:table-cell"></th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => {
            const s = statusStyle(u.status);
            const cellBase = `py-3 bg-card ${s.overlay} border-y border-r-0 border-l-0 first:border-r-4 last:border-l first:rounded-r-xl last:rounded-l-xl ${s.border}`;
            return (
              <tr key={u.id} className="transition hover:opacity-95 cursor-pointer" onClick={() => onOpen(u)}>
                <td className={`${cellBase} px-1.5 sm:px-4 font-bold whitespace-nowrap`}>{u.unit_number}</td>
                {columns.map((c) => {
                  const val = u.extra?.[c];
                  if (isPriceCol(c)) {
                    return (
                      <td key={c} className={`${cellBase} px-1.5 sm:px-4 whitespace-nowrap`}>
                        {s.hidePrice ? (
                          <span className="text-muted-foreground italic">—</span>
                        ) : val ? (
                          <span className="text-brand font-bold">{val}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={c}
                      className={`${cellBase} px-1.5 sm:px-4 break-words ${isFeaturesCol(c) ? "hidden md:table-cell text-muted-foreground max-w-[260px] truncate" : ""}`}
                      title={isFeaturesCol(c) ? val ?? "" : undefined}
                    >
                      {val || "—"}
                    </td>
                  );
                })}
                <td className={`${cellBase} px-1.5 sm:px-4`}>
                  <StatusPill status={u.status} />
                </td>
                <td className={`${cellBase} px-1.5 sm:px-4 text-left hidden sm:table-cell`}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpen(u); }}
                    className="px-3 py-1.5 rounded-md bg-brand/10 text-brand text-xs hover:bg-brand/20 transition"
                  >
                    التفاصيل ←
                  </button>
                </td>
              </tr>
            );
          })}

        </tbody>
      </table>
    </div>
  );
}

function UnitCard({
  unit,
  columns,
  onClick,
}: {
  unit: UnitRow;
  columns: string[];
  onClick: () => void;
}) {
  const s = statusStyle(unit.status);
  const featured = columns
    .filter((c) => !isFeaturesCol(c) && (unit.extra?.[c] ?? "").length > 0)
    .slice(0, 5);
  return (
    <button
      onClick={onClick}
      className={`relative w-full text-right bg-card rounded-xl border-2 ${s.border} px-4 sm:px-5 py-4 hover:shadow-md transition-all overflow-hidden`}
    >
      {s.overlay && (
        <div className={`absolute inset-0 pointer-events-none ${s.overlay}`} />
      )}
      <div className="relative flex items-center gap-4 flex-wrap sm:flex-nowrap">
        {/* Unit number block (right) */}
        <div className="shrink-0 min-w-[88px]">
          <div className="text-[11px] text-muted-foreground">رقم الوحدة</div>
          <div className="text-2xl font-bold mt-0.5">{unit.unit_number}</div>
        </div>
        {/* Horizontal data cells */}
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-x-5 gap-y-2 text-sm">
          {featured.map((c) => (
            <div key={c} className="min-w-0">
              <div className="text-[11px] text-muted-foreground truncate">{c}</div>
              <div className="text-sm font-medium truncate">
                {isPriceCol(c) ? (
                  s.hidePrice ? (
                    <span className="text-muted-foreground italic">—</span>
                  ) : (
                    <span className="text-brand font-bold">{unit.extra[c]}</span>
                  )
                ) : (
                  unit.extra[c]
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Status + CTA (left) */}
        <div className="shrink-0 flex items-center gap-3 ml-auto">
          <StatusPill status={unit.status} />
          <span className="hidden sm:inline text-xs text-brand whitespace-nowrap">التفاصيل ←</span>
        </div>
      </div>
    </button>
  );
}

function Pair({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

function ContactRow({
  label,
  phone,
  waText,
  highlight,
}: {
  label: string;
  phone: string;
  waText?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex items-center justify-between gap-3 flex-wrap ${
        highlight ? "border-brand/40 bg-brand/5" : "border-border bg-card"
      }`}
    >
      <div className="text-right min-w-0">
        <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
        <div className="text-lg sm:text-xl font-bold tracking-wider" dir="ltr">
          {phone}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={telHref(phone)}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-lg border border-brand/40 text-brand text-sm font-medium hover:bg-brand/10 transition"
        >
          <Phone className="w-4 h-4" />
          اتصال
        </a>
        <a
          href={waHref(phone, waText)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium hover:bg-emerald-200 transition"
        >
          <MessageCircle className="w-4 h-4" />
          واتساب
        </a>
      </div>
    </div>
  );
}

function UnitDialog({
  unit,
  columns,
  onClose,
  project,
}: {
  unit: UnitRow | null;
  columns: string[];
  onClose: () => void;
  project: ProjectRow;
}) {
  const dataCols = unit
    ? columns.filter((c) => !isFeaturesCol(c) && !isVideoCol(c))
    : [];
  const featureCols = unit
    ? columns.filter((c) => isFeaturesCol(c) && (unit.extra?.[c] ?? "").length > 0)
    : [];
  const videoCol = unit
    ? columns.find((c) => isVideoCol(c) && (unit.extra?.[c] ?? "").trim().length > 0)
    : undefined;
  const videoUrl = videoCol && unit ? unit.extra?.[videoCol] : undefined;

  return (
    <Sheet open={!!unit} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl p-0"
      >
        {unit && (
          <div className="px-5 pb-6 pt-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
            <SheetHeader>
              <SheetTitle className="text-xl text-right">
                وحدة رقم {unit.unit_number}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-2">
              <StatusPill status={unit.status} />
            </div>

            {unit.plan_image && (
              <a
                href={unit.plan_image}
                target="_blank"
                rel="noreferrer"
                className="block mt-4 rounded-lg overflow-hidden border border-border bg-white"
              >
                <img
                  src={unit.plan_image}
                  alt={`مخطط الوحدة ${unit.unit_number}`}
                  className="w-full h-auto object-contain"
                />
              </a>
            )}

            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full min-h-[44px] items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-brand to-brand/80 text-white font-bold shadow hover:opacity-95 transition"
              >
                <Video className="w-5 h-5" />
                مشاهدة فيديو 3D للوحدة
              </a>
            )}

            {dataCols.length > 0 && (
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                {dataCols.map((c) => {
                  const isPrice = isPriceCol(c);
                  const hide = isPrice && statusStyle(unit.status).hidePrice;
                  return (
                    <DataBox
                      key={c}
                      label={c}
                      value={hide ? "—" : unit.extra?.[c] ?? null}
                      accent={isPrice && !hide && !!unit.extra?.[c]}
                    />
                  );
                })}
              </div>
            )}

            {featureCols.map((c) => (
              <div key={c} className="mt-5 pt-4 border-t border-border">
                <h3 className="text-sm font-bold text-navy mb-2">{c}</h3>
                <p className="text-sm text-muted-foreground leading-loose whitespace-pre-line">
                  {unit.extra[c]}
                </p>
              </div>
            ))}

            {/* Unified contact box */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                <div className="text-xs text-muted-foreground mb-1">للحجز والاستفسار</div>
                <div className="text-xl font-bold tracking-wider" dir="ltr">{UNIFIED_PHONE}</div>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <a
                    href={telHref(UNIFIED_PHONE)}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-brand/40 text-brand font-medium hover:bg-brand/10 transition"
                  >
                    <Phone className="w-5 h-5" />
                    اتصال
                  </a>
                  <a
                    href={waHref(UNIFIED_PHONE, `السلام عليكم، أرغب بالاستفسار عن ${project.name} - وحدة رقم ${unit.unit_number}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200 transition"
                  >
                    <MessageCircle className="w-5 h-5" />
                    واتساب
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}


function DataBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | null | undefined;
  accent?: boolean;
}) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3 text-center">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div
        className={`text-sm font-bold ${accent ? "text-brand" : "text-foreground"}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function MobileUnitsTable({
  units,
  columns,
  onOpen,
}: {
  units: UnitRow[];
  columns: string[];
  onOpen: (u: UnitRow) => void;
}) {
  const areaCol = columns.find(isAreaCol);
  const priceCol = columns.find(isPriceCol);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <table
        className="w-full text-right text-[13px]"
        style={{ tableLayout: "fixed", borderSpacing: "0 6px", borderCollapse: "separate" }}
      >
        <colgroup>
          <col style={{ width: "16%" }} />
          <col style={{ width: "28%" }} />
          <col style={{ width: "36%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead className="bg-muted/50 text-muted-foreground text-[12px]">
          <tr>
            <th className="px-1 py-2 font-medium">الوحدة</th>
            <th className="px-1 py-2 font-medium">المساحة</th>
            <th className="px-1 py-2 font-medium">السعر</th>
            <th className="px-1 py-2 font-medium">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {units.map((u, i) => {
            const s = statusStyle(u.status);
            const area = areaCol ? u.extra?.[areaCol] : "";
            const price = priceCol ? u.extra?.[priceCol] : "";
            return (
              <tr
                key={u.id}
                onClick={() => onOpen(u)}
                className={`cursor-pointer active:bg-muted/60 animate-slide-in-right ${s.overlay}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <td className={`px-1 py-2.5 font-bold truncate border-r-4 ${s.border} bg-card`}>{u.unit_number}</td>
                <td className="px-1 py-2.5 truncate bg-card">{area || "—"}</td>
                <td className="px-1 py-2.5 truncate bg-card">
                  {s.hidePrice ? (
                    <span className="text-muted-foreground italic">—</span>
                  ) : price ? (
                    <span className="text-brand font-bold">{price}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-1 py-2.5 bg-card">
                  <StatusPill status={u.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

