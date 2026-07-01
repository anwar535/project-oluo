import { useEffect, useState } from "react";
import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { formatNumber } from "@/lib/property-numbers";

/**
 * Counts up from 0 to `value` whenever `active` flips to true.
 * Used for the big cinematic price/area figures.
 */
export function AnimatedNumber({
  value,
  active,
  duration = 1.3,
  format = formatNumber,
}: {
  value: number;
  active: boolean;
  duration?: number;
  format?: (n: number) => string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(() => (prefersReducedMotion ? format(value) : format(0)));

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(format(value));
      return;
    }
    if (!active) return;

    motionValue.set(0);
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsubscribe = motionValue.on("change", (v) => setDisplay(format(v)));
    return () => {
      controls.stop();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, value, prefersReducedMotion]);

  return <span dir="ltr">{display}</span>;
}
