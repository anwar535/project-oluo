import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { ProjectsCinematicShowcase } from "@/components/ProjectsCinematicShowcase";
import { AnimatedNumber } from "@/components/AnimatedNumber";
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

  const { data: unitCounts = {} } = useQuery({
    queryKey: ["unit-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("project_id");
      if (error) throw error;
      const map: Record<string, number> = {};
      (data as { project_id: string }[]).forEach((u) => {
        map[u.project_id] = (map[u.project_id] || 0) + 1;
      });
      return map;
    },
  });

  const visible = useMemo(
    () =>
      projects.filter((p) => (filter === "الكل" ? true : p.status === filter)),
    [projects, filter],
  );

  const totalUnits = Object.values(unitCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,theme(colors.brand.DEFAULT/40),transparent_50%),radial-gradient(circle_at_80%_80%,theme(colors.brand.DEFAULT/20),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-brand uppercase tracking-[0.4em] text-xs mb-4"
          >
            OLUO PROJECTS
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black tracking-tight"
          >
            مشاريعنا <span className="text-brand">الفاخرة</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 text-white/70 max-w-2xl mx-auto"
          >
            مجموعة من المشاريع السكنية الفاخرة بمواقع مميزة وتشطيبات راقية في
            أرقى أحياء الرياض.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto"
          >
            <Stat label="المشاريع" value={projects.length} />
            <Stat label="إجمالي الوحدات" value={totalUnits} />
            <Stat
              label="مدن التغطية"
              value={new Set(projects.map((p) => p.district).filter(Boolean)).size || 1}
            />
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className="mx-auto max-w-7xl px-6 pt-10 flex flex-wrap gap-2 justify-center">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm transition-all border ${
              filter === f
                ? "bg-brand text-black border-brand shadow-md scale-105"
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
        ) : visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            لا توجد مشاريع مطابقة لهذا التصنيف حالياً.
          </p>
        ) : (
          <ProjectsCinematicShowcase projects={visible} counts={unitCounts} />
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur px-4 py-4">
      <AnimatedNumber
        value={value}
        className="block text-3xl font-black text-brand"
      />
      <div className="text-xs text-white/70 mt-1">{label}</div>
    </div>
  );
}
