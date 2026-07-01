import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { formatNumber } from "@/lib/property-numbers";
import type { ProjectRow } from "@/lib/types";
import type { ProjectStats } from "@/lib/property-numbers";

export type ShowcaseProject = ProjectRow & ProjectStats;

const HEADER_OFFSET_PX = 80; // يطابق ارتفاع الهيدر الثابت في الموقع

export function ProjectsCinematicShowcase({ projects }: { projects: ShowcaseProject[] }) {
  const count = projects.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (count < 2) return;
    const idx = Math.min(count - 1, Math.max(0, Math.floor(v * count)));
    setActive((prev) => (prev === idx ? prev : idx));
  });

  if (count === 0) return null;

  if (count === 1 || prefersReducedMotion) {
    return (
      <section className="relative mx-auto max-w-7xl px-3 sm:px-6 mt-6">
        <StaticSlide project={projects[0]} />
      </section>
    );
  }

  return (
    <>
      <section className="md:hidden mt-5">
        <MobileCinematicStack projects={projects} />
      </section>

      <section ref={containerRef} style={{ height: `${count * 120}vh` }} className="relative hidden md:block">
      <div
        className="sticky overflow-hidden bg-black"
        style={{
          top: HEADER_OFFSET_PX,
          height: `calc(100vh - ${HEADER_OFFSET_PX}px)`,
        }}
      >
        {projects.map((p, i) => (
          <BackgroundLayer
            key={p.id}
            project={p}
            index={i}
            count={count}
            active={active === i}
            scrollYProgress={scrollYProgress}
          />
        ))}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-transparent to-black/60 pointer-events-none" />

        <SlideContent key={projects[active].id} project={projects[active]} active />

        {/* نقاط مؤشر التقدم */}
        <div className="absolute bottom-5 inset-x-0 z-20 flex justify-center gap-2">
          {projects.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? "w-8 bg-brand" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* تلميح التمرير */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 text-[11px] tracking-[0.3em] text-white/50 uppercase hidden md:block">
          Scroll
        </div>
      </div>
      </section>
    </>
  );
}

function useSlideRange(index: number, count: number) {
  const segStart = index / count;
  const segEnd = (index + 1) / count;
  const fade = (segEnd - segStart) * 0.32;
  const isFirst = index === 0;
  const isLast = index === count - 1;

  const points = isFirst
    ? [segStart, segEnd - fade, segEnd]
    : isLast
      ? [segStart, segStart + fade, segEnd]
      : [segStart, segStart + fade, segEnd - fade, segEnd];

  return { points, isFirst, isLast, segStart, segEnd };
}

function BackgroundLayer({
  project,
  index,
  count,
  active,
  scrollYProgress,
}: {
  project: ShowcaseProject;
  index: number;
  count: number;
  active: boolean;
  scrollYProgress: MotionValue<number>;
}) {
  const { points, isFirst, isLast } = useSlideRange(index, count);
  const opacityValues = isFirst ? [1, 1, 0] : isLast ? [0, 1, 1] : [0, 1, 1, 0];
  const scaleValues = isFirst ? [1, 1.08, 1.14] : isLast ? [1, 1.06, 1.12] : [1, 1.05, 1.1, 1.14];

  const opacity = useTransform(scrollYProgress, points, opacityValues);
  const scale = useTransform(scrollYProgress, points, scaleValues);

  return (
    <motion.div
      style={{
        opacity,
        zIndex: active ? 2 : 1,
        pointerEvents: "none",
      }}
      className="absolute inset-0 will-change-[opacity]"
    >

      {project.cover_image ? (
        <motion.img
          src={project.cover_image}
          alt={project.name}
          style={{ scale }}
          className="h-full w-full object-cover will-change-transform"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-navy to-stone-800" />
      )}
    </motion.div>
  );
}

function SlideContent({
  project,
  active,
}: {
  project: ShowcaseProject;
  active: boolean;
}) {
  const hasPrice = project.minPrice !== null;
  const hasArea = project.minArea !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 34 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      style={{ zIndex: 11, pointerEvents: "auto" }}
      className="absolute inset-0 flex flex-col justify-end will-change-[opacity,transform]"
    >

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 pb-20 sm:pb-16 pointer-events-auto">
        <p className="text-brand text-xs sm:text-sm tracking-[0.35em] uppercase mb-2">
          {project.type || project.category}
        </p>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-[1.05] drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]">
          {project.name}
        </h2>
        {project.district && <p className="mt-2 text-white/70 text-sm sm:text-base">{project.district}</p>}

        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-10 gap-y-5 sm:gap-x-14">
          {hasArea && (
            <StatFigure
              label="المساحة"
              active={active}
              value={project.maxArea ?? project.minArea!}
              rangeFrom={project.minArea !== project.maxArea ? project.minArea! : undefined}
              unit="م²"
            />
          )}
          {hasPrice && (
            <StatFigure label="السعر يبدأ من" active={active} value={project.minPrice!} unit="ريال" highlight />
          )}
          <div className="flex flex-col justify-end">
            <span className="text-[11px] sm:text-xs text-white/50 mb-1">التوفر</span>
            <span className="text-lg sm:text-xl font-bold text-white">
              {project.availableCount > 0 ? `${formatNumber(project.availableCount)} وحدة متاحة` : project.status}
            </span>
          </div>
        </div>

        <Link
          to="/projects/$slug"
          params={{ slug: project.slug }}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand text-brand-foreground font-bold text-sm hover:brightness-110 active:scale-[0.97] transition-all"
        >
          استكشف المشروع
          <span aria-hidden>←</span>
        </Link>
      </div>
    </motion.div>
  );
}

function MobileCinematicStack({ projects }: { projects: ShowcaseProject[] }) {
  return (
    <div className="px-4 overflow-hidden">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {projects.map((project) => {
          const hasPrice = project.minPrice !== null;
          const hasArea = project.minArea !== null;
          return (
            <Link
              key={project.id}
              to="/projects/$slug"
              params={{ slug: project.slug }}
              className="group relative min-w-[84vw] h-[72vh] max-h-[620px] snap-center overflow-hidden rounded-[1.75rem] bg-black shadow-2xl"
            >
              {project.cover_image ? (
                <img
                  src={project.cover_image}
                  alt={project.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-active:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-navy to-stone-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />

              <div className="relative z-10 flex h-full flex-col justify-end p-5 text-right">
                <p className="text-brand text-[11px] tracking-[0.28em] uppercase mb-2">
                  {project.type || project.category}
                </p>
                <h2 className="text-3xl font-black text-white leading-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.75)]">
                  {project.name}
                </h2>
                {project.district && <p className="mt-2 text-white/75 text-sm">{project.district}</p>}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  {hasArea && (
                    <MobileStat
                      label="المساحة"
                      value={`${formatNumber(project.minArea!)}${project.minArea !== project.maxArea ? `-${formatNumber(project.maxArea!)}` : ""}`}
                      unit="م²"
                    />
                  )}
                  {hasPrice && (
                    <MobileStat label="يبدأ من" value={formatNumber(project.minPrice!)} unit="ريال" highlight />
                  )}
                  <div className="col-span-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
                    <span className="block text-[11px] text-white/55 mb-1">التوفر</span>
                    <span className="text-base font-bold text-white">
                      {project.availableCount > 0 ? `${formatNumber(project.availableCount)} وحدة متاحة` : project.status}
                    </span>
                  </div>
                </div>

                <div className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-foreground">
                  استكشف المشروع
                  <span aria-hidden>←</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileStat({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
      <span className="block text-[11px] text-white/55 mb-1">{label}</span>
      <span className={`text-lg font-black leading-none ${highlight ? "text-brand" : "text-white"}`} dir="ltr">
        {value}
      </span>
      <span className="mr-1 text-xs text-white/65">{unit}</span>
    </div>
  );
}

function StatFigure({
  label,
  value,
  rangeFrom,
  unit,
  active,
  highlight,
}: {
  label: string;
  value: number;
  rangeFrom?: number;
  unit: string;
  active: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <span className="block text-[11px] sm:text-xs text-white/50 mb-1">{label}</span>
      <span
        className={`flex items-baseline gap-1.5 font-black tabular-nums leading-none ${
          highlight ? "text-brand" : "text-white"
        } text-3xl sm:text-4xl md:text-5xl`}
      >
        {rangeFrom !== undefined && (
          <>
            <AnimatedNumber value={rangeFrom} active={active} />
            <span className="text-lg sm:text-xl font-medium opacity-60">-</span>
          </>
        )}
        <AnimatedNumber value={value} active={active} />
        <span className="text-sm sm:text-base font-medium opacity-70">{unit}</span>
      </span>
    </div>
  );
}

function StaticSlide({ project }: { project: ShowcaseProject }) {
  const hasPrice = project.minPrice !== null;
  const hasArea = project.minArea !== null;
  return (
    <div className="relative rounded-2xl sm:rounded-[2rem] overflow-hidden bg-black min-h-[70vh] flex flex-col justify-end">
      {project.cover_image && (
        <img
          src={project.cover_image}
          alt={project.name}
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
      <div className="relative px-6 sm:px-10 pb-12 pt-16">
        <p className="text-brand text-xs sm:text-sm tracking-[0.35em] uppercase mb-2">
          {project.type || project.category}
        </p>
        <h2 className="text-3xl sm:text-5xl font-black text-white">{project.name}</h2>
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          {hasArea && <StatFigure label="المساحة" active value={project.maxArea!} unit="م²" />}
          {hasPrice && <StatFigure label="السعر يبدأ من" active value={project.minPrice!} unit="ريال" highlight />}
        </div>
        <Link
          to="/projects/$slug"
          params={{ slug: project.slug }}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand text-brand-foreground font-bold text-sm"
        >
          استكشف المشروع ←
        </Link>
      </div>
    </div>
  );
}
