import { ArrowLeft, BedDouble, Building2, Layers3, Ruler, Scan } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UnitRow } from "@/lib/types";
import { featureChips, isAreaCol, isBuiltAreaCol, isFeaturesCol, isFloorCol, isPriceCol, isPrivateAreaCol, isRoomsCol, statusStyle } from "./unit-utils";
import { StatusPill } from "./UnitsTable";

export function UnitCard({ unit, columns, onOpen }: { unit: UnitRow; columns: string[]; onOpen: () => void }) {
  const style = statusStyle(unit.status);
  const priceCol = columns.find(isPriceCol);
  const price = priceCol ? unit.extra?.[priceCol] : "";
  const areaCol = columns.find(isAreaCol);
  const builtCol = columns.find(isBuiltAreaCol);
  const privateCol = columns.find(isPrivateAreaCol);
  const roomsCol = columns.find(isRoomsCol);
  const floorCol = columns.find(isFloorCol);
  const stats = [
    { column: areaCol, icon: Ruler },
    { column: builtCol ?? privateCol, icon: builtCol ? Building2 : Scan },
    { column: roomsCol ?? floorCol, icon: roomsCol ? BedDouble : Layers3 },
  ].filter((stat): stat is { column: string; icon: LucideIcon } => !!stat.column);
  const features = columns.filter(isFeaturesCol).flatMap((column) => featureChips(unit.extra?.[column])).slice(0, 3);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }}
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border border-r-4 bg-card p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring ${style.side}`}
    >
      <div className="absolute left-4 top-4"><StatusPill status={unit.status} /></div>
      <div className="pl-20">
        <div className="text-xs text-muted-foreground">رقم الوحدة</div>
        <div className="mt-0.5 text-3xl font-black tabular-nums">{unit.unit_number}</div>
      </div>

      {stats.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          {stats.map(({ column, icon: Icon }) => (
            <div key={column} className="min-w-0 rounded-xl bg-muted/50 px-2 py-3 text-center">
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-brand" />
              <div className="truncate text-[10px] text-muted-foreground" title={column}>{column}</div>
              <div className="mt-0.5 truncate text-sm font-bold" title={unit.extra?.[column] || "—"}>{unit.extra?.[column] || "—"}</div>
            </div>
          ))}
        </div>
      )}

      {features.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {features.map((feature) => <span key={feature} className="max-w-full truncate rounded-full bg-secondary px-2.5 py-1 text-[11px] text-secondary-foreground">{feature}</span>)}
        </div>
      )}

      <div className="mt-auto pt-5">
        <div className="border-t border-border pt-4">
          <div className="text-xs text-muted-foreground">{priceCol ?? "السعر"}</div>
          <div className={`mt-1 text-2xl font-black tabular-nums ${style.hidePrice || !price ? "text-muted-foreground" : "text-brand"}`}>
            {style.hidePrice || !price ? "—" : price}
          </div>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(); }} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 text-sm font-bold text-navy-foreground transition group-hover:bg-brand group-hover:text-brand-foreground">
          عرض التفاصيل <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
