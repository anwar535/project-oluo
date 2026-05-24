import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectRow } from "@/lib/types";
import { PROJECT_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/projects")({
  component: ProjectsTablePage,
  head: () => ({
    meta: [
      { title: "كل المشاريع | علو العقارية" },
      {
        name: "description",
        content: "جدول كامل بمشاريع علو العقارية مع الحي، الفئة، والحالة.",
      },
    ],
  }),
});

const FILTERS = ["الكل", ...PROJECT_STATUSES] as const;

function ProjectsTablePage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("الكل");
  const [query, setQuery] = useState("");

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

  const visible = projects.filter((p) => {
    if (filter !== "الكل" && p.status !== filter) return false;
    if (query && !`${p.name} ${p.district ?? ""} ${p.type ?? ""}`.includes(query))
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pt-12 pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-navy text-center">
          كل المشاريع
        </h1>
        <p className="text-center text-muted-foreground mt-2">
          عرض مختصر لجميع مشاريع علو العقارية.
        </p>
      </section>

      <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم المشروع أو الحي..."
          className="flex-1 min-w-[220px] h-11 rounded-lg border border-border bg-card px-4 text-right text-sm focus:outline-none focus:border-brand"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                filter === f
                  ? "bg-navy text-navy-foreground border-navy"
                  : "bg-card border-border hover:border-brand"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 pb-16">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm text-right">
            <thead className="bg-navy text-navy-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">المشروع</th>
                <th className="px-4 py-3 font-semibold">الفئة</th>
                <th className="px-4 py-3 font-semibold">النوع</th>
                <th className="px-4 py-3 font-semibold">الحي</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </td>
                </tr>
              )}
              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد نتائج.
                  </td>
                </tr>
              )}
              {visible.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border hover:bg-accent/40 transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-brand">{p.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.cover_image && (
                        <img
                          src={p.cover_image}
                          alt=""
                          className="h-10 w-14 rounded-md object-cover border border-border"
                          loading="lazy"
                        />
                      )}
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.category === "Villas" ? "فلل" : "شقق"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.district}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/projects/$slug"
                      params={{ slug: p.slug }}
                      className="text-brand text-sm hover:underline whitespace-nowrap"
                    >
                      التفاصيل ←
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "متاح للبيع"
      ? "bg-emerald-100 text-emerald-700"
      : status === "البيع على الخارطة"
        ? "bg-blue-100 text-blue-700"
        : status === "قريباً"
          ? "bg-amber-100 text-amber-700"
          : "bg-stone-200 text-stone-700";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs ${color}`}>
      {status}
    </span>
  );
}
