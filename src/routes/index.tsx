import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PROJECTS, type Status } from "@/data/projects";

export const Route = createFileRoute("/")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "مشاريعنا | علو العقارية" },
      {
        name: "description",
        content:
          "تجربة سكن استثنائية بتصاميم فاخرة. تصفّح مشاريع علو العقارية: شقق وفلل في أرقى أحياء الرياض.",
      },
    ],
  }),
});

const FILTERS: Array<"الكل" | Status> = [
  "الكل",
  "متاح للبيع",
  "البيع على الخارطة",
  "قريباً",
  "مُباع بالكامل",
];

const statusColor: Record<Status, string> = {
  "متاح للبيع": "bg-emerald-600",
  "البيع على الخارطة": "bg-sky-700",
  "قريباً": "bg-stone-600",
  "مُباع بالكامل": "bg-rose-700",
};

function ProjectsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("الكل");
  const visible = useMemo(
    () => (filter === "الكل" ? PROJECTS : PROJECTS.filter((p) => p.status === filter)),
    [filter],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand/15 border border-brand/30 px-4 py-1.5 text-xs text-navy">
          ✦ مشاريع سكنية متميزة في حي العقيق
        </span>
        <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight text-navy">
          <span className="text-brand">علو</span> العقارية
        </h1>
        <p className="mt-6 text-muted-foreground max-w-2xl mx-auto leading-loose">
          تجربة سكن استثنائية بتصاميم فاخرة ومساحات تليق بطموحاتك. اختر مشروعك المثالي
          من بين مشاريعنا الراقية.
        </p>
      </section>

      {/* Section title */}
      <div className="text-center mb-8">
        <p className="text-brand text-xs tracking-[0.4em] uppercase">Our Projects</p>
        <h2 className="text-3xl md:text-4xl font-bold mt-3 text-navy">مشاريعنا</h2>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-sm transition-all border ${
                filter === f
                  ? "bg-brand text-brand-foreground border-brand shadow-sm"
                  : "bg-card text-foreground border-border hover:border-brand/60 hover:text-brand"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {visible.map((p) => (
            <Link
              key={p.id}
              to="/projects/$slug"
              params={{ slug: p.slug }}
              className="group bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span
                  className={`absolute top-4 right-4 ${statusColor[p.status]} text-white text-xs px-3 py-1.5 rounded-full shadow-md`}
                >
                  {p.status}
                </span>
              </div>
              <div className="p-6 text-right">
                <p className="text-brand text-xs uppercase tracking-widest mb-2">
                  {p.category}
                </p>
                <h3 className="text-2xl font-bold mb-1 text-navy">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{p.tagline}</p>
                <p className="text-muted-foreground text-sm flex items-center justify-end gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {p.district}
                </p>
                <div className="mt-5 inline-block w-full text-center bg-brand text-brand-foreground py-2.5 rounded-md text-sm font-medium group-hover:bg-brand/90 transition-colors">
                  استعرض الوحدات
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-border bg-navy text-navy-foreground/80">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-center">
          © {new Date().getFullYear()} علو العقارية — جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}
