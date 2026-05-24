import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";

export function SiteHeader() {
  return (
    <header className="bg-navy text-navy-foreground sticky top-0 z-30 border-b border-white/5">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src={logo} alt="علو العقارية" className="h-12 w-auto" />
          <div className="leading-tight text-right hidden sm:block">
            <div className="text-lg font-bold text-brand">علو العقارية</div>
            <div className="text-[10px] tracking-[0.25em] text-brand/70">
              OLUO REAL ESTATE
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          <Link
            to="/"
            className="px-4 py-2 rounded-md hover:bg-white/5 hover:text-brand transition-colors"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-brand bg-white/5" }}
          >
            الرئيسية
          </Link>
          <Link
            to="/projects"
            className="px-4 py-2 rounded-md hover:bg-white/5 hover:text-brand transition-colors"
            activeProps={{ className: "text-brand bg-white/5" }}
          >
            المشاريع
          </Link>
        </nav>
      </div>
    </header>
  );
}
