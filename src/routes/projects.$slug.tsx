import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { List, LayoutGrid, Phone, MessageCircle, Video, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ProjectRow, UnitRow } from "@/lib/types";


// Status-driven visual treatment for a unit row/card
function statusStyle(status: string) {
  switch (status) {
    case "متاح":
      return { border: "border-emerald-500", overlay: "", hidePrice: false };
    case "محجوز":
      return { border: "border-amber-500", overlay: "bg-amber-500/10", hidePrice: true };
    case "مباع":
      return { border: "border-red-500", overlay: "bg-red-500/10", hidePrice: true };
    case "غير متاح":
    default:
      return { border: "border-gray-400", overlay: "bg-gray-500/10", hidePrice: true };
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

function ProjectPage() {
  const { project } = Route.useLoaderData();
  const columns = project.columns ?? [];
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTS)[number]>("كل الحالات");
  const [search_, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [active, setActive] = useState<UnitRow | null>(null);
  const isMobile = useIsMobile();

  // Auto-switch to grid/cards on mobile for better touch UX
  useEffect(() => {
    if (isMobile) setView("grid");
  }, [isMobile]);

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
      <header className="relative w-full bg-black text-white overflow-hidden">
        {project.cover_image && (
          <img
            src={project.cover_image}
            alt={project.name}
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        )}
        {/* Dark gradient overlay so titles remain readable and image blends into the black */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black" />
        <div className="relative mx-auto max-w-7xl px-6 pt-16 pb-12 md:pt-28 md:pb-20 text-center min-h-[58vh] md:min-h-[70vh] flex flex-col justify-end">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
            {primaryTitle}
          </h1>
          <p className="mt-3 text-base md:text-lg font-semibold text-amber-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
            {complexLabel}
          </p>
          <p className="mt-1 text-sm md:text-base text-amber-200/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">
            {districtLine}
          </p>
        </div>
      </header>



      {/* 3. Statistics — directly under the cover image */}
      {units.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 mt-6 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm bg-card border border-border rounded-full px-5 py-2">
            <Stat label="الإجمالي" value={counts.total} />
            <span className="text-border">|</span>
            <Stat label="متاح" value={counts.available} tone="emerald" />
            <span className="text-border">|</span>
            <Stat label="محجوز" value={counts.reserved} tone="amber" />
            <span className="text-border">|</span>
            <Stat label="مباع" value={counts.sold} tone="stone" />
          </div>
        </section>
      )}

      {/* 4. Filters + view toggles */}
      <section className="mx-auto max-w-7xl px-6 mt-8">
        {units.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search_}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الوحدة أو أي بيان..."
              className="flex-1 min-w-[220px] h-11 rounded-lg border border-border bg-card px-4 text-right text-sm focus:outline-none focus:border-brand"
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as (typeof STATUS_OPTS)[number])
              }
              className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
            >
              {STATUS_OPTS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <div className="inline-flex rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setView("table")}
                aria-label="عرض الجدول"
                title="عرض الجدول"
                className={`px-4 h-11 inline-flex items-center justify-center transition ${
                  view === "table"
                    ? "bg-navy text-navy-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView("grid")}
                aria-label="عرض الشبكة"
                title="عرض الشبكة"
                className={`px-4 h-11 inline-flex items-center justify-center transition ${
                  view === "grid"
                    ? "bg-navy text-navy-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </section>


      <main className="mx-auto max-w-7xl px-6 pb-6 mt-6">
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
          <UnitsTable units={visible} columns={publicColumns} onOpen={setActive} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visible.map((u) => (
              <UnitCard key={u.id} unit={u} columns={publicColumns} onClick={() => setActive(u)} />
            ))}
          </div>
        )}

      </main>

      {/* Mandatory disclaimer notes — directly under the tables */}
      <section className="mx-auto max-w-7xl px-6">
        <div className="rounded-xl border border-border bg-muted/40 px-5 py-4 text-xs sm:text-sm leading-7 text-muted-foreground text-center">
          • تسري الأسعار حتى تاريخ 2026/06/30. <br className="sm:hidden" />
          • جميع المعلومات المذكورة تقديرية، والمعتمد هي البيانات الواردة في الوثائق الصادرة من الجهات الرسمية.
        </div>
      </section>

      {/* Contact section — at the very bottom */}
      <section className="bg-muted/40 border-t border-border mt-10">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="text-center text-2xl font-bold text-navy">
            للحجز والاستفسار
          </h2>
          <div className="mx-auto mt-2 h-0.5 w-16 bg-brand rounded-full" />
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CONTACT_PHONES.map((phone) => (
              <ContactCard key={phone} phone={phone} />
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
  // Show up to first 3 non-features columns + price if present
  const featured = columns
    .filter((c) => !isFeaturesCol(c) && (unit.extra?.[c] ?? "").length > 0)
    .slice(0, 4);
  return (
    <button
      onClick={onClick}
      className={`relative text-right bg-card rounded-xl border-2 ${s.border} p-5 hover:shadow-md transition-all overflow-hidden`}
    >
      {s.overlay && (
        <div className={`absolute inset-0 pointer-events-none ${s.overlay}`} />
      )}
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-muted-foreground">رقم الوحدة</div>
            <div className="text-2xl font-bold mt-1">{unit.unit_number}</div>
          </div>
          <StatusPill status={unit.status} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          {featured.map((c) => (
            <Pair
              key={c}
              label={c}
              value={
                isPriceCol(c) ? (
                  s.hidePrice ? (
                    <span className="text-muted-foreground italic">—</span>
                  ) : (
                    <span className="text-brand font-bold">{unit.extra[c]}</span>
                  )
                ) : (
                  unit.extra[c]
                )
              }
            />
          ))}
        </dl>
        <div className="mt-4 pt-3 border-t border-border text-xs text-brand">
          عرض التفاصيل ←
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

function ContactCard({ phone }: { phone: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 text-center">
      <div className="text-xl font-bold tracking-wider" dir="ltr">{phone}</div>
      <div className="mt-4 flex justify-center gap-2">
        <a
          href={telHref(phone)}
          className="px-4 py-2 rounded-md bg-brand/15 text-brand text-sm hover:bg-brand/25 transition inline-flex items-center gap-1.5"
        >
          <Phone className="w-4 h-4" />
          اتصال
        </a>
        <a
          href={waHref(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-md bg-emerald-100 text-emerald-700 text-sm hover:bg-emerald-200 transition inline-flex items-center gap-1.5"
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
  const primaryPhone = CONTACT_PHONES[0];

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
    <Dialog open={!!unit} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        {unit && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-right">
                وحدة رقم {unit.unit_number}
              </DialogTitle>
            </DialogHeader>

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
                className="mt-4 inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-brand to-brand/80 text-white font-bold shadow hover:opacity-95 transition"
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

            <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
              <a
                href={waHref(primaryPhone, unit ? `السلام عليكم، أرغب بالاستفسار عن ${project.name} - وحدة رقم ${unit.unit_number}` : undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
              >
                <MessageCircle className="w-5 h-5" />
                تواصل واتساب
              </a>
              <a
                href={telHref(primaryPhone)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-navy text-navy-foreground font-medium hover:bg-navy/90 transition"
              >
                <Phone className="w-5 h-5" />
                اتصل بنا
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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
