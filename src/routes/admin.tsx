import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import type { ProjectRow, UnitRow } from "@/lib/types";
import { UNIT_STATUSES, PROJECT_STATUSES } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "لوحة التحكم | علو العقارية" }] }),
});

function AdminPage() {
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ProjectRow[];
    },
    enabled: !!session,
  });

  const { data: units = [], refetch: refetchUnits } = useQuery({
    queryKey: ["admin-units", selectedProject],
    queryFn: async () => {
      if (!selectedProject) return [];
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("project_id", selectedProject)
        .order("sort_order");
      if (error) throw error;
      return data as UnitRow[];
    },
    enabled: !!selectedProject,
  });

  async function runSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/public/hooks/sync-sheet", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "خطأ في المزامنة");
      setSyncMsg(`تمت المزامنة: ${json.inserted} جديد، ${json.updated} محدث`);
      qc.invalidateQueries({ queryKey: ["admin-projects"] });
      qc.invalidateQueries({ queryKey: ["admin-units"] });
    } catch (e: any) {
      setSyncMsg("فشل المزامنة: " + e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function updateUnit(id: string, patch: Partial<UnitRow>) {
    const { error } = await supabase.from("units").update(patch).eq("id", id);
    if (error) alert(error.message);
    else refetchUnits();
  }

  async function updateProject(id: string, patch: Partial<ProjectRow>) {
    const { error } = await supabase.from("projects").update(patch).eq("id", id);
    if (error) alert(error.message);
    else qc.invalidateQueries({ queryKey: ["admin-projects"] });
  }

  async function uploadPlan(unitId: string, file: File) {
    const path = `${unitId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("plans").upload(path, file, {
      upsert: true,
    });
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("plans").getPublicUrl(path);
    await updateUnit(unitId, { plan_image: data.publicUrl });
  }

  async function bulkUploadPlans(files: FileList) {
    if (!selectedProject || files.length === 0) return;
    setSyncMsg(null);
    let matched = 0;
    const unmatched: string[] = [];
    const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    const unitMap = new Map(units.map((u) => [norm(u.unit_number), u.id]));

    for (const file of Array.from(files)) {
      const base = file.name.replace(/\.[^.]+$/, "");
      const baseN = norm(base);
      let unitId: string | undefined;
      const tokens = baseN.split(/[-_\s.()]+/).filter(Boolean);
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (unitMap.has(tokens[i])) { unitId = unitMap.get(tokens[i]); break; }
      }
      if (!unitId) {
        const candidates = [...unitMap.keys()]
          .filter((un) => baseN.includes(un))
          .sort((a, b) => b.length - a.length);
        if (candidates[0]) unitId = unitMap.get(candidates[0]);
      }
      if (!unitId) { unmatched.push(file.name); continue; }
      const path = `${unitId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("plans").upload(path, file, { upsert: true });
      if (error) { unmatched.push(`${file.name} (${error.message})`); continue; }
      const { data } = supabase.storage.from("plans").getPublicUrl(path);
      const { error: e2 } = await supabase.from("units").update({ plan_image: data.publicUrl }).eq("id", unitId);
      if (e2) { unmatched.push(`${file.name} (${e2.message})`); continue; }
      matched++;
    }
    refetchUnits();
    setSyncMsg(
      `تم ربط ${matched} مخطط بالوحدات.` +
        (unmatched.length
          ? ` لم تتم مطابقة: ${unmatched.slice(0, 5).join("، ")}${unmatched.length > 5 ? ` (+${unmatched.length - 5} ملف آخر)` : ""}`
          : ""),
    );
  }

  async function uploadCover(projectId: string, file: File) {
    const path = `covers/${projectId}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("plans").upload(path, file, {
      upsert: true,
    });
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("plans").getPublicUrl(path);
    await updateProject(projectId, { cover_image: data.publicUrl });
  }

  async function addUnit() {
    if (!selectedProject) return;
    const num = prompt("رقم الوحدة؟");
    if (!num) return;
    const { error } = await supabase
      .from("units")
      .insert({ project_id: selectedProject, unit_number: num });
    if (error) alert(error.message);
    else refetchUnits();
  }

  async function deleteUnit(id: string) {
    if (!confirm("حذف الوحدة؟")) return;
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) alert(error.message);
    else refetchUnits();
  }

  if (loading) return <div className="p-10 text-center">جارٍ التحقق...</div>;
  if (!session) return null;
  if (!isAdmin)
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="p-10 text-center text-red-600">
          ليس لديك صلاحية الوصول للوحة التحكم.
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-black text-navy">لوحة التحكم</h1>
          <div className="flex gap-2 items-center">
            <button
              onClick={runSync}
              disabled={syncing}
              className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-50"
            >
              {syncing ? "جارٍ المزامنة..." : "مزامنة من Google Sheet"}
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/login" });
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm"
            >
              خروج
            </button>
          </div>
        </div>
        {syncMsg && (
          <div className="mb-4 p-3 rounded-lg bg-accent/40 text-sm">{syncMsg}</div>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-bold mb-3">المشاريع</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm text-right">
              <thead className="bg-navy text-navy-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">الاسم</th>
                  <th className="px-3 py-2">الحي</th>
                  <th className="px-3 py-2">الحالة</th>
                  <th className="px-3 py-2">الغلاف</th>
                  <th className="px-3 py-2">الوحدات</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-bold text-brand">{p.id}</td>
                    <td className="px-3 py-2">
                      <input
                        defaultValue={p.name}
                        onBlur={(e) =>
                          e.target.value !== p.name &&
                          updateProject(p.id, { name: e.target.value })
                        }
                        className="bg-transparent border-b border-border w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        defaultValue={p.district ?? ""}
                        onBlur={(e) =>
                          updateProject(p.id, { district: e.target.value })
                        }
                        className="bg-transparent border-b border-border w-full"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        defaultValue={p.status}
                        onChange={(e) =>
                          updateProject(p.id, { status: e.target.value })
                        }
                        className="bg-transparent border border-border rounded px-1"
                      >
                        {PROJECT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <label className="text-xs text-brand cursor-pointer">
                        رفع
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] && uploadCover(p.id, e.target.files[0])
                          }
                        />
                      </label>
                      {p.cover_image && (
                        <img
                          src={p.cover_image}
                          alt=""
                          className="h-8 w-12 inline-block mr-2 rounded object-cover"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setSelectedProject(p.id)}
                        className="text-brand text-xs hover:underline"
                      >
                        إدارة ←
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedProject && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">
                وحدات مشروع {selectedProject}
              </h2>
              <button
                onClick={addUnit}
                className="px-3 py-1.5 rounded-lg bg-navy text-navy-foreground text-xs"
              >
                + إضافة وحدة
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-xs text-right">
                <thead className="bg-accent">
                  <tr>
                    <th className="px-2 py-2">الوحدة</th>
                    <th className="px-2 py-2">المساحة</th>
                    <th className="px-2 py-2">الأبعاد</th>
                    <th className="px-2 py-2">البناء</th>
                    <th className="px-2 py-2">السعر</th>
                    <th className="px-2 py-2">المميزات</th>
                    <th className="px-2 py-2">الحالة</th>
                    <th className="px-2 py-2">المخطط</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id} className="border-t border-border">
                      <EditableCell value={u.unit_number} onSave={(v) => updateUnit(u.id, { unit_number: v })} />
                      <EditableCell value={u.area_m2 ?? ""} onSave={(v) => updateUnit(u.id, { area_m2: v })} />
                      <EditableCell value={u.dimensions ?? ""} onSave={(v) => updateUnit(u.id, { dimensions: v })} />
                      <EditableCell value={u.built_area_m2 ?? ""} onSave={(v) => updateUnit(u.id, { built_area_m2: v })} />
                      <EditableCell value={u.price ?? ""} onSave={(v) => updateUnit(u.id, { price: v })} />
                      <EditableCell value={u.features ?? ""} onSave={(v) => updateUnit(u.id, { features: v })} />
                      <td className="px-2 py-1">
                        <select
                          defaultValue={u.status}
                          onChange={(e) => updateUnit(u.id, { status: e.target.value })}
                          className="bg-transparent border border-border rounded"
                        >
                          {UNIT_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <label className="text-brand cursor-pointer">
                          رفع
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              e.target.files?.[0] && uploadPlan(u.id, e.target.files[0])
                            }
                          />
                        </label>
                        {u.plan_image && (
                          <a href={u.plan_image} target="_blank" rel="noreferrer" className="text-brand mr-2">
                            عرض
                          </a>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <button onClick={() => deleteUnit(u.id)} className="text-red-600">حذف</button>
                      </td>
                    </tr>
                  ))}
                  {units.length === 0 && (
                    <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">لا توجد وحدات بعد.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function EditableCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  return (
    <td className="px-2 py-1">
      <input
        defaultValue={value}
        onBlur={(e) => e.target.value !== value && onSave(e.target.value)}
        className="bg-transparent border-b border-border w-full min-w-[80px]"
      />
    </td>
  );
}
