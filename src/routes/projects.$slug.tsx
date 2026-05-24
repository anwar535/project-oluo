import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
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
});

const STATUS_OPTS = ["كل الحالات", "متاح", "محجوز", "مباع"] as const;

function ProjectPage() {
  const { project } = Route.useLoaderData();
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTS)[number]>("كل الحالات");
  const [search, setSearch] = useState("");
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
      return data as UnitRow[];
    },
  });

  const visible = units.filter((u) => {
    if (statusFilter !== "كل الحالات" && u.status !== statusFilter) return false;
    if (search && !`${u.unit_number} ${u.features ?? ""}`.includes(search))
      return false;
    return true;
  });

  const counts = {
    total: units.length,
    available: units.filter((u) => u.status === "متاح").length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pt-14 pb-6 text-center">
        <p className="text-brand uppercase tracking-[0.3em] text-xs mb-3">
          {project.category === "Villas" ? "فلل" : "شقق"}
        </p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-navy">
          {project.name}
        </h1>
        {project.tagline && (
          <p className="mt-4 text-muted-foreground">{project.tagline}</p>
        )}
        {units.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            إجمالي الوحدات:{" "}
            <span className="font-bold text-foreground">{counts.total}</span>
            <span className="mx-2">•</span>
            متاح:{" "}
            <span className="font-bold text-emerald-700">{counts.available}</span>
          </p>
        )}
      </section>

      {project.cover_image && (
        <section className="mx-auto max-w-7xl px-6">
          <div className="relative aspect-[16/7] overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={project.cover_image}
              alt={project.name}
              className="h-full w-full object-cover"
            />
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 mt-10">
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
            {["0570020095", "0570020093", "0554745500"].map((phone) => (
              <div
                key={phone}
                className="bg-card rounded-xl border border-border p-5 text-center"
              >
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
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/projects" className="text-sm text-brand hover:underline">
              ← عودة لجميع المشاريع
            </Link>
          </div>
        </div>
      </section>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-right">
                  وحدة رقم {active.unit_number}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs ${
                    active.status === "متاح"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-200 text-stone-700"
                  }`}
                >
                  {active.status}
                </span>
              </div>
              {active.plan_image && (
                <a
                  href={active.plan_image}
                  target="_blank"
                  rel="noreferrer"
                  className="block mt-3 rounded-lg overflow-hidden border border-border"
                >
                  <img
                    src={active.plan_image}
                    alt={`مخطط الوحدة ${active.unit_number}`}
                    className="w-full h-auto object-contain bg-white"
                  />
                </a>
              )}
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {active.area_m2 && <Row label="المساحة م²" value={active.area_m2} />}
                {active.dimensions && (
                  <Row label="الأطوال" value={active.dimensions} />
                )}
                {active.built_area_m2 && (
                  <Row label="مسطح البناء م²" value={active.built_area_m2} />
                )}
                <Row
                  label="السعر"
                  value={
                    active.price ? (
                      <span className="text-brand font-bold">{active.price}</span>
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>
              {active.features && (
                <p className="mt-5 pt-4 border-t border-border text-sm text-muted-foreground leading-loose">
                  {active.features}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs mb-1">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function UnitCard({ unit, onClick }: { unit: UnitRow; onClick: () => void }) {
  const available = unit.status === "متاح";
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
        <span
          className={`text-xs px-2.5 py-1 rounded-full ${
            available
              ? "bg-emerald-100 text-emerald-700"
              : "bg-stone-200 text-stone-600"
          }`}
        >
          {unit.status}
        </span>
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

