import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { TiltCard } from "@/components/TiltCard";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import {
  ProjectsCinematicShowcase,
  type ShowcaseProject,
} from "@/components/ProjectsCinematicShowcase";
import { supabase } from "@/integrations/supabase/client";
import { computeProjectStats, type UnitLite } from "@/lib/property-numbers";
import type { ProjectRow } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "علو العقارية | مشاريع سكنية فاخرة في الرياض" },
      {
        name: "description",
        content: "تصفح مشاريع علو العقارية: شقق وفلل سكنية فاخرة بمواقع متميزة في الرياض.",
      },
    ],
  }),
});

const FILTERS = ["الكل", ...PROJECT_STATUSES] as const;
const SHOWCASE_LIMIT = 5;

function HomePage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("الكل");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("sort_order");
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  const { data: statsMap = {} } = useQuery({
    queryKey: ["projects-stats", projectIds.join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("project_id,status,extra")
        .in("project_id", projectIds);
      if (error) throw error;
      const byProject = new Map<string, UnitLite[]>();
      (data as UnitLite[]).forEach((u) => {
        if (!byProject.has(u.project_id)) byProject.set(u.project_id, []);
        byProject.get(u.project_id)!.push(u);
      });
      const result: Record<string, ReturnType<typeof computeProjectStats>> = {};
      projects.forEach((p) => {
        result[p.id] = computeProjectStats(byProject.get(p.id) ?? [], p.columns);
      });
      return result;
    },
  });

  const enriched: ShowcaseProject[] = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        ...(statsMap[p.id] ?? {
          minPrice: null,
          maxPrice: null,
          minArea: null,
          maxArea: null,
          availableCount: 0,
          totalUnits: 0,
        }),
      })),
    [projects, statsMap],
  );

  const visible = enriched.filter((p) => (filter === "الكل" ? true : p.status === filter));

  const showcase = useMemo(
    () => enriched.filter((p) => p.status !== "مُباع بالكامل").slice(0, SHOWCASE_LIMIT),
    [enriched],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pt-12 pb-6 text-center">
        <p className="text-brand uppercase tracking-[0.35em] text-xs mb-3">OLUO PROJECTS</p>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-navy">مشاريعنا</h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          مجموعة من المشاريع السكنية الفاخرة بمواقع مميزة وتشطيبات راقية.
        </p>
      </section>

      {!isLoading && showcase.length > 0 && <ProjectsCinematicShowcase projects={showcase} />}

      <div className="mx-auto max-w-7xl px-6 mt-10 flex flex-wrap gap-2 justify-center">
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
            {visible.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ project, index }: { project: ShowcaseProject; index: number }) {
  const hasPrice = project.minPrice !== null;
  const hasArea = project.minArea !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: Math.min(index, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <TiltCard className="h-full">
        <Link
          to="/projects/$slug"
          params={{ slug: project.slug }}
          className="group block h-full bg-card border border-border rounded-2xl overflow-hidden hover:border-brand hover:shadow-xl transition-[border-color,box-shadow] [transform-style:preserve-3d]"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className={statusBadge(project.status)}>{project.status}</span>

            {(hasPrice || hasArea) && (
              <div className="absolute inset-x-0 bottom-0 px-4 pb-3 flex items-end justify-between gap-3 text-white">
                {hasArea && (
                  <div>
                    <div className="text-[10px] text-white/60">المساحة</div>
                    <div className="text-lg font-black tabular-nums" dir="ltr">
                      <AnimatedNumber
                        value={project.maxArea ?? project.minArea!}
                        active
                        duration={1.1}
                      />
                      <span className="text-xs font-medium opacity-70"> م²</span>
                    </div>
                  </div>
                )}
                {hasPrice && (
                  <div className="text-left">
                    <div className="text-[10px] text-white/60">يبدأ من</div>
                    <div className="text-lg font-black tabular-nums text-brand" dir="ltr">
                      <AnimatedNumber value={project.minPrice!} active duration={1.1} />
                      <span className="text-xs font-medium opacity-80"> ريال</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-5 text-right">
            <p className="text-xs text-brand mb-1">{project.type}</p>
            <h3 className="text-xl font-bold text-navy">{project.name}</h3>
            {project.district && (
              <p className="text-sm text-muted-foreground mt-1">{project.district}</p>
            )}
            <div className="mt-4 pt-3 border-t border-border text-sm text-brand flex items-center justify-between">
              <span>عرض التفاصيل ←</span>
              {project.availableCount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {project.availableCount} وحدة متاحة
                </span>
              )}
            </div>
          </div>
        </Link>
      </TiltCard>
    </motion.div>
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
  return `absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs z-10 ${color}`;
}
