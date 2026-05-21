import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "مشاريعنا | علو العقارية" },
      {
        name: "description",
        content:
          "تصفّح أحدث مشاريع علو العقارية من علو 16 إلى علو 28 — فلل، شقق سكنية، وتاون هاوس في أرقى أحياء الرياض.",
      },
    ],
  }),
});

type Status = "متاح للبيع" | "البيع على الخارطة" | "قريباً" | "مُباع بالكامل";

type Project = {
  id: string;
  name: string;
  type: string;
  district: string;
  status: Status;
  image: string;
};

const PROJECTS: Project[] = [
  {
    id: "16",
    name: "علو 16",
    type: "فلل",
    district: "حي النرجس",
    status: "متاح للبيع",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-%D9%A1%D9%A6%D9%A4-scaled.jpeg",
  },
  {
    id: "17",
    name: "علو 17",
    type: "فلل",
    district: "حي المصيف",
    status: "متاح للبيع",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B4%D9%A1%D9%A7.jpg",
  },
  {
    id: "18",
    name: "علو 18",
    type: "تاون هاوس",
    district: "حي النرجس",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D9%A2.jpg",
  },
  {
    id: "19",
    name: "علو 19",
    type: "فلل",
    district: "حي النرجس",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-19-copy-2-e1776593918813.jpg",
  },
  {
    id: "20",
    name: "علو 20",
    type: "تاون هاوس",
    district: "حي النرجس",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/b1-e1776594534348.jpg",
  },
  {
    id: "21",
    name: "علو 21",
    type: "تاون هاوس",
    district: "حي النفل",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-%D9%A2%D9%A1%D9%A5.jpg",
  },
  {
    id: "22",
    name: "علو 22",
    type: "شقق سكنية",
    district: "حي العقيق",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-%D9%A2%D9%A2%D9%A5.jpg",
  },
  {
    id: "23",
    name: "علو 23",
    type: "شقق سكنية",
    district: "حي غرناطة",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/02/JPG-4-e1776593998863.jpg",
  },
  {
    id: "24",
    name: "علو 24",
    type: "فلل وأدوار",
    district: "حي النرجس",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/0_55-Photo.jpg",
  },
  {
    id: "25",
    name: "علو 25",
    type: "شقق سكنية",
    district: "حي النزهة",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/1_1-Photo-e1776598058388.jpg",
  },
  {
    id: "26",
    name: "علو 26",
    type: "شقق سكنية",
    district: "حي عرقه",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/1_52-Photo-copy-copy-copy.jpg",
  },
  {
    id: "27",
    name: "علو 27",
    type: "فلل",
    district: "حي النرجس",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/0_59-Photo.jpg",
  },
  {
    id: "28",
    name: "علو 28",
    type: "شقق سكنية",
    district: "حي النرجس",
    status: "البيع على الخارطة",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/02/%D9%86%D8%B3%D8%AE%D8%A9-%D9%85%D9%86-q5-1.jpg",
  },
];

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
    <div dir="rtl" className="min-h-screen bg-background text-foreground font-arabic">
      {/* Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-brand flex items-center justify-center text-brand-foreground font-bold">
              ع
            </div>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight">علو العقارية</div>
              <div className="text-xs text-muted-foreground">Oluo Real Estate</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a className="text-brand font-medium" href="#">مشاريعنا</a>
            <a className="hover:text-brand transition-colors" href="#">عن علو</a>
            <a className="hover:text-brand transition-colors" href="#">سجّل اهتمامك</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10 text-center">
        <p className="text-brand text-sm tracking-[0.3em] mb-4">مشاريع علو</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          مشاريعنا
        </h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto leading-loose">
          مجموعة مختارة من مشاريع علو العقارية تجمع بين الجودة والابتكار،
          في أرقى أحياء الرياض.
        </p>
      </section>

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
                  : "bg-background text-foreground border-border hover:border-brand/60 hover:text-brand"
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
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} علو العقارية — جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const showCta = project.status === "متاح للبيع" || project.status === "البيع على الخارطة" || project.status === "قريباً";
  return (
    <article className="group bg-card rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-xl transition-all duration-500">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={project.image}
          alt={project.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span
          className={`absolute top-4 right-4 ${statusColor[project.status]} text-white text-xs px-3 py-1.5 rounded-full shadow-md`}
        >
          {project.status}
        </span>
      </div>
      <div className="p-6 text-right">
        <p className="text-brand text-sm mb-1.5">{project.type}</p>
        <h3 className="text-2xl font-bold mb-2">{project.name}</h3>
        <p className="text-muted-foreground text-sm flex items-center justify-end gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {project.district}
        </p>
        {showCta && (
          <a
            href={`https://ahmed71.azq1.com/ioluo/%d8%b3%d8%ac%d9%91%d9%84-%d8%a7%d9%87%d8%aa%d9%85%d8%a7%d9%85%d9%83/?project=${encodeURIComponent(project.name)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block w-full text-center bg-brand text-brand-foreground py-2.5 rounded-md text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            سجّل اهتمامك
          </a>
        )}
      </div>
    </article>
  );
}
