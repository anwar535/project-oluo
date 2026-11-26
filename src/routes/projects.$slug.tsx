import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ProjectRow, UnitRow } from "@/lib/types";
import { formatPriceValidityNotice } from "@/lib/sheet-normalize";
import { formatNumber } from "@/lib/property-numbers";
import { MobileContactBar } from "@/components/project/MobileContactBar";
import { UnitCard } from "@/components/project/UnitCard";
import { UnitDetailsSheet } from "@/components/project/UnitDetailsSheet";
import { UnitGridSkeleton } from "@/components/project/UnitGridSkeleton";
import { UnitsTable, MobileUnitsTable } from "@/components/project/UnitsTable";
import { UnitsToolbar } from "@/components/project/UnitsToolbar";
import { distinctUnitValues, isAreaCol, isFloorCol, isPriceCol, isRoomsCol, isVideoCol, lowestAvailablePrice, sortUnits, type StatusFilter, type UnitSort } from "@/components/project/unit-utils";
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/projects/$slug")({
  validateSearch: (search): { unit?: string } => ({
    ...(typeof search.unit === "string" && search.unit.trim() ? { unit: search.unit } : {}),
  }),
  component: ProjectPage,
  loader: async ({ params }) => {
    const { data, error } = await supabase.from("projects").select("*").eq("slug", params.slug).maybeSingle();
    if (error || !data) throw notFound();
    return { project: data as ProjectRow };
  },
  head: ({ loaderData, params }) => {
    const title = `${loaderData?.project.name ?? "المشروع"} | علو العقارية`;
    const description = `${loaderData?.project.tagline ?? ""} — ${loaderData?.project.district ?? ""}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://project-oluo.lovable.app/projects/${params.slug}` },
        { property: "og:image", content: loaderData?.project.cover_image ?? "" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">المشروع غير موجود.</p></div>,
  errorComponent: ({ error }) => <div className="p-10 text-center text-destructive">{String(error)}</div>,
});

const CONTACT_PHONES = ["0570020095", "0570020093", "0554745500"];
const UNIFIED_PHONE = "9200022287";

function toIntl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return `966${digits.slice(1)}`;
  return `966${digits}`;
}
const telHref = (phone: string) => `tel:+${toIntl(phone)}`;
const waHref = (phone: string, text?: string) => `https://wa.me/${toIntl(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

function ProjectPage() {
  const { project } = Route.useLoaderData();
  const { unit: unitParam } = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/$slug" });
  const columns = project.columns ?? [];
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("كل الحالات");
  const [search_, setSearch] = useState("");
  const [sort, setSort] = useState<UnitSort>("available");
  const [floorFilter, setFloorFilter] = useState("");
  const [roomsFilter, setRoomsFilter] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [contactVisible, setContactVisible] = useState(false);
  const contactRef = useRef<HTMLElement>(null);
  const isMobile = useIsMobile();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units", project.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").eq("project_id", project.id).order("sort_order");
      if (error) throw error;
      return data as UnitRow[];
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => setView(isMobile ? "grid" : "table"), [isMobile]);
  useEffect(() => {
    const element = contactRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setContactVisible(!!entry?.isIntersecting), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const areaCol = columns.find(isAreaCol);
  const priceCol = columns.find(isPriceCol);
  const floorCol = columns.find(isFloorCol);
  const roomsCol = columns.find(isRoomsCol);
  const floorValues = useMemo(() => distinctUnitValues(units, floorCol), [units, floorCol]);
  const roomValues = useMemo(() => distinctUnitValues(units, roomsCol), [units, roomsCol]);

  const visible = useMemo(() => {
    const query = search_.trim().toLowerCase();
    const filtered = units.filter((unit) => {
      if (statusFilter !== "كل الحالات" && unit.status !== statusFilter) return false;
      if (floorFilter && floorCol && unit.extra?.[floorCol]?.trim() !== floorFilter) return false;
      if (roomsFilter && roomsCol && unit.extra?.[roomsCol]?.trim() !== roomsFilter) return false;
      if (query) {
        const haystack = `${unit.unit_number} ${Object.values(unit.extra ?? {}).join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    return sortUnits(filtered, sort, areaCol, priceCol);
  }, [units, statusFilter, search_, floorFilter, roomsFilter, floorCol, roomsCol, sort, areaCol, priceCol]);

  const counts = useMemo(() => ({
    total: units.length,
    available: units.filter((unit) => unit.status === "متاح").length,
    reserved: units.filter((unit) => unit.status === "محجوز").length,
    sold: units.filter((unit) => unit.status === "مباع").length,
    unavailable: units.filter((unit) => unit.status === "غير متاح").length,
  }), [units]);
  const startingPrice = lowestAvailablePrice(units, priceCol);
  const active = unitParam ? units.find((unit) => unit.unit_number === unitParam) ?? null : null;
  const publicColumns = useMemo(() => columns.filter((column) => !isVideoCol(column)), [columns]);
  const hasActiveFilters = !!(search_.trim() || floorFilter || roomsFilter || statusFilter !== "كل الحالات" || sort !== "available");

  const openUnit = (unit: UnitRow) => {
    void navigate({ replace: true, search: (previous) => ({ ...previous, unit: unit.unit_number }) });
  };
  const closeUnit = () => {
    void navigate({ replace: true, search: (previous) => {
      const next = { ...previous };
      delete next.unit;
      return next;
    } });
  };
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("كل الحالات");
    setFloorFilter("");
    setRoomsFilter("");
    setSort("available");
  };

  const primaryTitle = /^مشروع/.test(project.name) ? project.name : `مشروع ${project.name}`;
  const complexLabel = project.category === "Villas" ? "مجمع فلل فاخرة" : "مجمع شقق سكنية فاخرة";
  const districtLine = (() => {
    const district = (project.district ?? "").trim();
    if (!district) return "الرياض";
    let value = district;
    if (!/^حي\s/.test(value)) value = `حي ${value}`;
    if (!/الرياض\s*$/.test(value)) value = `${value} - الرياض`;
    return value;
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="group relative w-full overflow-hidden bg-black text-white">
        {project.cover_image && (
          <motion.img
            src={project.cover_image}
            alt={project.name}
            loading="eager"
            fetchPriority="high"
            initial={{ scale: 1.06, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.92 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="pointer-events-none absolute left-4 top-4 z-10 inline-flex select-none items-center animate-fade-in-up md:left-6 md:top-6">
          <img src={logo} alt="علو" className="h-10 w-auto md:h-12" style={{ filter: "brightness(0) invert(1)" }} draggable={false} />
        </div>
        <div className="relative mx-auto flex min-h-[66vh] max-w-7xl flex-col justify-end px-5 pb-8 pt-16 text-center sm:px-6 md:min-h-[76vh] md:pb-12 md:pt-28">
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }} className="text-4xl font-black tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.75)] md:text-7xl">{primaryTitle}</motion.h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }} className="mt-3 text-base font-semibold text-brand drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)] md:text-lg">{complexLabel}</motion.p>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28, ease: [0.16, 1, 0.3, 1] }} className="mt-1 text-sm text-brand/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)] md:text-base">{districtLine}</motion.p>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.42, ease: [0.16, 1, 0.3, 1] }} className="mt-7 grid grid-cols-2 gap-2.5 text-right md:grid-cols-4 md:gap-3">
            <HeroMetric label="إجمالي الوحدات" value={counts.total} />
            <HeroMetric label="متاح" value={counts.available} tone="brand" />
            <HeroMetric label="محجوز" value={counts.reserved} />
            <HeroMetric label="مباع" value={counts.sold} />
          </motion.div>
          {startingPrice !== null && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 text-sm font-bold text-brand md:text-base">الأسعار تبدأ من {formatNumber(startingPrice)} ريال</motion.p>
          )}
        </div>
      </header>

      {units.length > 0 && (
        <UnitsToolbar
          search={search_}
          onSearch={setSearch}
          status={statusFilter}
          onStatus={setStatusFilter}
          sort={sort}
          onSort={setSort}
          counts={{ متاح: counts.available, محجوز: counts.reserved, مباع: counts.sold, "غير متاح": counts.unavailable }}
          floorValues={floorValues}
          floor={floorFilter}
          onFloor={setFloorFilter}
          roomValues={roomValues}
          rooms={roomsFilter}
          onRooms={setRoomsFilter}
          resultCount={visible.length}
          total={counts.total}
          hasActiveFilters={hasActiveFilters}
          onReset={resetFilters}
          view={view}
          onView={setView}
        />
      )}

      <main className="mx-auto mt-6 max-w-7xl animate-fade-in-up px-3 pb-24 sm:px-6">
        {isLoading ? <UnitGridSkeleton /> : units.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">لا توجد وحدات معروضة حالياً لهذا المشروع.</div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-muted-foreground">لا توجد وحدات مطابقة للبحث.</div>
        ) : view === "table" ? (
          isMobile ? <MobileUnitsTable units={visible} columns={publicColumns} onOpen={openUnit} /> : <UnitsTable units={visible} columns={publicColumns} onOpen={openUnit} />
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((unit) => <UnitCard key={unit.id} unit={unit} columns={publicColumns} onOpen={() => openUnit(unit)} />)}
          </div>
        )}
      </main>

      <section className="mx-auto max-w-7xl animate-fade-in-up px-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-5 py-4 text-right text-xs leading-7 text-amber-900 sm:text-sm">
          • {formatPriceValidityNotice(project.price_valid_until)}.<br />
          • جميع المعلومات المذكورة تقديرية، والمعتمد هي البيانات الواردة في الوثائق الصادرة من الجهات الرسمية.
        </div>
      </section>

      <section ref={contactRef} id="contact" className="mt-10 animate-fade-in-up border-t border-border bg-muted/40">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <h2 className="text-center text-xl font-bold text-navy">تواصل معنا</h2>
          <div className="mx-auto mb-6 mt-2 h-0.5 w-16 rounded-full bg-brand" />
          <div className="space-y-3">
            <ContactRow label="الرقم الموحد" phone={UNIFIED_PHONE} waText={`السلام عليكم، أرغب بالاستفسار عن ${project.name}`} highlight />
            {CONTACT_PHONES.map((phone, index) => <ContactRow key={phone} label={index === 0 ? "للحجز والاستفسار" : "\u00A0"} phone={phone} waText={`السلام عليكم، أرغب بالاستفسار عن ${project.name}`} />)}
          </div>
        </div>
      </section>

      <UnitDetailsSheet unit={active} units={visible} columns={columns} project={project} onClose={closeUnit} onNavigate={openUnit} />
      <MobileContactBar phone={toIntl(UNIFIED_PHONE)} whatsappHref={waHref(UNIFIED_PHONE, `السلام عليكم، أرغب بالاستفسار عن ${project.name}`)} hidden={!!active || contactVisible} />
    </div>
  );
}

function HeroMetric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "brand" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <div className="mb-1 text-[11px] text-white/55">{label}</div>
      <div className={`text-2xl font-black tabular-nums md:text-3xl ${tone === "brand" ? "text-brand" : "text-white"}`}>{value}</div>
    </div>
  );
}

function ContactRow({ label, phone, waText, highlight }: { label: string; phone: string; waText?: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${highlight ? "border-brand/40 bg-brand/5" : "border-border bg-card"}`}>
      <div className="min-w-0 text-right">
        <div className="mb-0.5 text-[11px] text-muted-foreground">{label}</div>
        <div className="text-lg font-bold tracking-wider sm:text-xl" dir="ltr">{phone}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <a href={telHref(phone)} className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-brand/40 px-4 text-sm font-medium text-brand transition hover:bg-brand/10"><Phone className="h-4 w-4" /> اتصال</a>
        <a href={waHref(phone, waText)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-emerald-100 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-200"><MessageCircle className="h-4 w-4" /> واتساب</a>
      </div>
    </div>
  );
}
