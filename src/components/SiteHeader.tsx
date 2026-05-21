import { Link } from "@tanstack/react-router";
import { PROJECTS } from "@/data/projects";

export function SiteHeader() {
  return (
    <header className="bg-navy text-navy-foreground sticky top-0 z-30 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="h-11 w-11 rounded-md bg-brand/15 border border-brand/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand" fill="currentColor">
              <path d="M3 21V8l6-4 6 4v13H3zm12 0V11l6 4v6h-6z" opacity=".9" />
            </svg>
          </div>
          <div className="leading-tight text-right">
            <div className="text-lg font-bold text-brand">علو العقارية</div>
            <div className="text-[10px] tracking-[0.25em] text-brand/70">OLUO REAL ESTATE</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden lg:flex items-center gap-5 text-sm">
          <Link
            to="/"
            className="hover:text-brand transition-colors"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-brand" }}
          >
            الرئيسية
          </Link>
          {PROJECTS.map((p) => (
            <Link
              key={p.id}
              to="/projects/$slug"
              params={{ slug: p.slug }}
              className="hover:text-brand transition-colors text-sm whitespace-nowrap"
              activeProps={{ className: "text-brand" }}
            >
              علو {p.id}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
