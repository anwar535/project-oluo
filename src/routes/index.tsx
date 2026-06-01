import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectRow } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "علو العقارية | مشاريع سكنية فاخرة في الرياض" },
      {
        name: "description",
        content:
          "تصفح مشاريع علو العقارية: شقق وفلل سكنية فاخرة بمواقع متميزة في الرياض.",
      },
    ],
  }),
});

const FILTERS = ["الكل", ...PROJECT_STATUSES] as const;

function HomePage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("الكل");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const visible = projects.filter((p) =>
    filter === "الكل" ? true : p.status === filter,
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10 text-center">
        <p className="text-brand uppercase tracking-[0.35em] text-xs mb-3">
          OLUO PROJECTS
        </p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-navy">
          مشاريعنا
        </h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          مجموعة من المشاريع السكنية الفاخرة بمواقع مميزة وتشطيبات راقية.
        </p>
      </section>

      <div className="mx-auto max-w-7xl px-6 flex flex-wrap gap-2 justify-center">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm transition-colors border ${
              filter === f
                ? "bg-navy text-navy-foreground border-navy"
                : "bg-card text-foreground border-border hover:border-brand"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {isLoading ? (
          <p className="text-center text-muted-foreground">جاري التحميل...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectRow }) {
  return (
    <Link
      to="/projects/$slug"
      params={{ slug: project.slug }}
      className="group block bg-card border border-border rounded-2xl overflow-hidden hover:border-brand hover:shadow-lg transition-all"
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-muted">
        {project.cover_image && (
          <img
            src={project.cover_image}
            alt={project.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        )}
        <span className={statusBadge(project.status)}>{project.status}</span>
      </div>
      <div className="p-5 text-right">
        <p className="text-xs text-brand mb-1">{project.type}</p>
        <h3 className="text-xl font-bold text-navy">{project.name}</h3>
        {project.district && (
          <p className="text-sm text-muted-foreground mt-1">{project.district}</p>
        )}
        <div className="mt-4 pt-3 border-t border-border text-sm text-brand">
          عرض التفاصيل ←
        </div>
      </div>
    </Link>
  );
}

function statusBadge(status: string) {
  const color =
    status === "متاح للبيع"
      ? "bg-emerald-600"
      : status === "البيع على الخارطة"
        ? "bg-blue-600"
        : status === "قريباً"
          ? "bg-amber-600"
          : "bg-stone-600";
  return `absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs ${color}`;
}
