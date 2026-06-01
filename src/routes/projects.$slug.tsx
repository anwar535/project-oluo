import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectRow, UnitRow } from "@/lib/types";

export const Route = createFileRoute("/projects/$slug")({
  component: ProjectPage,
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !data) throw notFound();
    return { project: data as unknown as ProjectRow };
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

function ProjectPage() {
  const { project } = Route.useLoaderData();
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTS)[number]>("كل الحالات");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("table");
  const [active, setActive] = useState<UnitRow | null>(null);

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["units", project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("project_id", project.id)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as UnitRow[];
    },
  });

  const visible = useMemo(
    () =>
      units.filter((u) => {
        if (statusFilter !== "كل الحالات" && u.status !== statusFilter) return false;
        if (
          search &&
          !`${u.unit_number} ${u.features ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [units, statusFilter, search],
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pt-12 pb-6 text-center">
        <Link to="/" className="text-xs text-brand hover:underline">
          ← الرئيسية
        </Link>
        <p className="text-brand uppercase tracking-[0.3em] text-xs mt-3 mb-2">
          {project.category === "Villas" ? "فلل" : "شقق"}
          {project.district ? ` • ${project.district}` : ""}
        </p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-navy">
          {project.name}
        </h1>
        {project.tagline && (
          <p className="mt-4 text-muted-foreground">{project.tagline}</p>
        )}
        {units.length > 0 && (
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm bg-card border border-border rounded-full px-5 py-2">
            <Stat label="الإجمالي" value={counts.total} />
            <span className="text-border">|</span>
            <Stat label="متاح" value={counts.available} tone="emerald" />
            <span className="text-border">|</span>
            <Stat label="محجوز" value={counts.reserved} tone="amber" />
            <span className="text-border">|</span>
            <Stat label="مباع" value={counts.sold} tone="stone" />
          </div>
        )}
      </section>

      {project.cover_image && (
        <section className="mx-auto max-w-7xl px-6">
          <div className="relative aspect-[16/6] overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={project.cover_image}
              alt={project.name}
              className="h-full w-full object-cover"
            />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 mt-8">
        {units.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الوحدة أو المميزات..."
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
                className={`px-4 h-11 text-sm transition ${
                  view === "table"
                    ? "bg-navy text-navy-foreground"
                    : "hover:bg-muted"
                }`}
              >
                جدول
              </button>
              <button
                onClick={() => setView("grid")}
                className={`px-4 h-11 text-sm transition ${
                  view === "grid"
                    ? "bg-navy text-navy-foreground"
                    : "hover:bg-muted"
                }`}
              >
                شبكة
              </button>
            </div>
          </div>
        )}
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-16 mt-6">
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
          <UnitsTable units={visible} onOpen={setActive} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visible.map((u) => (
              <UnitCard key={u.id} unit={u} onClick={() => setActive(u)} />
            ))}
          </div>
        )}
      </main>

      <section className="bg-muted/40 border-t border-border">
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

      <UnitDialog unit={active} onClose={() => setActive(null)} project={project} />
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
  onOpen,
}: {
  units: UnitRow[];
  onOpen: (u: UnitRow) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm text-right">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">رقم الوحدة</th>
            <th className="px-4 py-3 font-medium">المساحة م²</th>
            <th className="px-4 py-3 font-medium">الأطوال</th>
            <th className="px-4 py-3 font-medium">مسطح البناء م²</th>
            <th className="px-4 py-3 font-medium">السعر</th>
            <th className="px-4 py-3 font-medium">الحالة</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {units.map((u) => (
            <tr
              key={u.id}
              className="border-t border-border hover:bg-muted/30 transition"
            >
              <td className="px-4 py-3 font-bold">{u.unit_number}</td>
              <td className="px-4 py-3">{u.area_m2 ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {u.dimensions ?? "—"}
              </td>
              <td className="px-4 py-3">{u.built_area_m2 ?? "—"}</td>
              <td className="px-4 py-3">
                {u.price ? (
                  <span className="text-brand font-bold">{u.price}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={u.status} />
              </td>
              <td className="px-4 py-3 text-left">
                <button
                  onClick={() => onOpen(u)}
                  className="px-3 py-1.5 rounded-md bg-brand/10 text-brand text-xs hover:bg-brand/20 transition"
                >
                  التفاصيل ←
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnitCard({ unit, onClick }: { unit: UnitRow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-right bg-card rounded-xl border border-border p-5 hover:border-brand hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground">رقم الوحدة</div>
          <div className="text-2xl font-bold mt-1">{unit.unit_number}</div>
        </div>
        <StatusPill status={unit.status} />
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        {unit.area_m2 && <Pair label="المساحة م²" value={unit.area_m2} />}
        {unit.built_area_m2 && (
          <Pair label="مسطح البناء" value={unit.built_area_m2} />
        )}
        <Pair
          label="السعر"
          value={
            unit.price ? (
              <span className="text-brand font-bold">{unit.price}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      </dl>
      <div className="mt-4 pt-3 border-t border-border text-xs text-brand">
        عرض التفاصيل ←
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
      <div className="text-xl font-bold tracking-wider">{phone}</div>
      <div className="mt-4 flex justify-center gap-2">
        <a
          href={`tel:${phone}`}
          className="px-4 py-2 rounded-md bg-brand/15 text-brand text-sm hover:bg-brand/25 transition"
        >
          اتصال
        </a>
        <a
          href={`https://wa.me/966${phone.slice(1)}`}
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-md bg-emerald-100 text-emerald-700 text-sm hover:bg-emerald-200 transition"
        >
          واتساب
        </a>
      </div>
    </div>
  );
}

function UnitDialog({
  unit,
  onClose,
  project,
}: {
  unit: UnitRow | null;
  onClose: () => void;
  project: ProjectRow;
}) {
  const waText = unit
    ? encodeURIComponent(
        `السلام عليكم، أرغب بالاستفسار عن ${project.name} - وحدة رقم ${unit.unit_number}`,
      )
    : "";
  const primaryPhone = CONTACT_PHONES[0];

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

            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <DataBox label="المساحة م²" value={unit.area_m2} />
              <DataBox label="الأطوال" value={unit.dimensions} />
              <DataBox label="مسطح البناء م²" value={unit.built_area_m2} />
              <DataBox
                label="السعر"
                value={unit.price}
                accent={!!unit.price}
              />
            </div>

            {unit.features && (
              <div className="mt-5 pt-4 border-t border-border">
                <h3 className="text-sm font-bold text-navy mb-2">
                  المكونات والمميزات
                </h3>
                <p className="text-sm text-muted-foreground leading-loose whitespace-pre-line">
                  {unit.features}
                </p>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/966${primaryPhone.slice(1)}?text=${waText}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.81 11.81 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607z" />
                </svg>
                تواصل واتساب
              </a>
              <a
                href={`tel:${primaryPhone}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-navy text-navy-foreground font-medium hover:bg-navy/90 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24 11.36 11.36 0 003.57.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.24 1.02l-2.21 2.2z" />
                </svg>
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
