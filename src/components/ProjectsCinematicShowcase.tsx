import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, ArrowLeft, Building2 } from "lucide-react";
import type { ProjectRow } from "@/lib/types";
import { TiltCard } from "./TiltCard";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  projects: ProjectRow[];
  counts?: Record<string, number>;
};

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

function statusTone(status: string) {
  switch (status) {
    case "متاح للبيع":
      return "bg-emerald-500/90";
    case "البيع على الخارطة":
      return "bg-sky-500/90";
    case "قريباً":
      return "bg-brand text-black";
    case "مُباع بالكامل":
      return "bg-stone-600/90";
    default:
      return "bg-stone-600/90";
  }
}

export function ProjectsCinematicShowcase({ projects, counts = {} }: Props) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.05 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {projects.map((p) => (
        <motion.div key={p.id} variants={item}>
          <TiltCard className="h-full">
            <Link
              to="/projects/$slug"
              params={{ slug: p.slug }}
              className="group relative block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-2xl hover:border-brand/60 transition-all"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {p.cover_image && (
                  <motion.img
                    src={p.cover_image}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    initial={{ scale: 1.08 }}
                    whileHover={{ scale: 1.15 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span
                  className={`absolute top-3 right-3 px-3 py-1 rounded-full text-white text-xs shadow-md ${statusTone(
                    p.status,
                  )}`}
                >
                  {p.status}
                </span>
                <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2">
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-brand/90">
                      {p.type || p.category}
                    </p>
                    <h3 className="text-xl font-black leading-tight drop-shadow">
                      {p.name}
                    </h3>
                  </div>
                  {counts[p.id] != null && (
                    <div className="text-right bg-black/40 backdrop-blur px-2.5 py-1 rounded-lg border border-white/10">
                      <div className="text-[10px] text-white/70">وحدات</div>
                      <AnimatedNumber
                        value={counts[p.id]}
                        className="text-brand font-bold text-lg leading-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 text-right">
                {p.district && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                    <span>{p.district}</span>
                    <MapPin className="h-4 w-4 text-brand" />
                  </p>
                )}
                {p.tagline && (
                  <p className="mt-2 text-sm text-foreground/80 line-clamp-2">
                    {p.tagline}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-brand font-semibold group-hover:gap-2 transition-all">
                    عرض التفاصيل
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {p.category}
                  </span>
                </div>
              </div>
            </Link>
          </TiltCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
