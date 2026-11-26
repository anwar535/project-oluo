import type { UnitRow } from "@/lib/types";
import { isAreaCol, isFeaturesCol, isPriceCol, statusStyle } from "./unit-utils";

export function StatusPill({ status }: { status: string }) {
  const classes = status === "متاح"
    ? "bg-emerald-100 text-emerald-700"
    : status === "محجوز"
      ? "bg-amber-100 text-amber-700"
      : status === "مباع"
        ? "bg-stone-200 text-stone-700"
        : "bg-stone-100 text-stone-600";
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${classes}`}>{status}</span>;
}

type TableProps = { units: UnitRow[]; columns: string[]; onOpen: (unit: UnitRow) => void };

export function UnitsTable({ units, columns, onOpen }: TableProps) {
  return (
    <div className="-mx-6 overflow-x-auto px-2 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y pinch-zoom" }}>
      <table className="w-full table-fixed border-separate text-right text-[11px] sm:table-auto sm:text-sm" style={{ borderSpacing: "0 8px" }}>
        <thead className="text-muted-foreground">
          <tr>
            <th className="whitespace-nowrap px-1.5 py-2 font-medium sm:px-4">رقم الوحدة</th>
            {columns.map((column) => <th key={column} className={`px-1.5 py-2 font-medium sm:px-4 ${isFeaturesCol(column) ? "hidden md:table-cell" : ""}`}>{column}</th>)}
            <th className="px-1.5 py-2 font-medium sm:px-4">الحالة</th>
            <th className="hidden px-1.5 py-2 font-medium sm:table-cell sm:px-4" />
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => {
            const style = statusStyle(unit.status);
            const cell = `border-y border-r-0 border-l-0 bg-card py-3 first:rounded-r-xl first:border-r-4 last:rounded-l-xl last:border-l ${style.border} ${style.overlay}`;
            return (
              <tr key={unit.id} className="cursor-pointer transition hover:opacity-95" onClick={() => onOpen(unit)}>
                <td className={`${cell} whitespace-nowrap px-1.5 font-bold sm:px-4`}>{unit.unit_number}</td>
                {columns.map((column) => {
                  const value = unit.extra?.[column];
                  const hiddenPrice = isPriceCol(column) && (style.hidePrice || !value);
                  return (
                    <td key={column} className={`${cell} break-words px-1.5 sm:px-4 ${isFeaturesCol(column) ? "hidden max-w-[260px] truncate text-muted-foreground md:table-cell" : ""}`} title={isFeaturesCol(column) ? value ?? "" : undefined}>
                      {isPriceCol(column) ? hiddenPrice ? <span className="text-muted-foreground">—</span> : <span className="whitespace-nowrap font-bold text-brand">{value}</span> : value || "—"}
                    </td>
                  );
                })}
                <td className={`${cell} px-1.5 sm:px-4`}><StatusPill status={unit.status} /></td>
                <td className={`${cell} hidden px-1.5 text-left sm:table-cell sm:px-4`}>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onOpen(unit); }} className="rounded-md bg-brand/10 px-3 py-1.5 text-xs text-brand transition hover:bg-brand/20">التفاصيل ←</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function MobileUnitsTable({ units, columns, onOpen }: TableProps) {
  const areaCol = columns.find(isAreaCol);
  const priceCol = columns.find(isPriceCol);
  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-right text-[13px]" style={{ tableLayout: "fixed", borderSpacing: "0 6px", borderCollapse: "separate" }}>
        <colgroup><col style={{ width: "16%" }} /><col style={{ width: "28%" }} /><col style={{ width: "36%" }} /><col style={{ width: "20%" }} /></colgroup>
        <thead className="bg-muted/50 text-[12px] text-muted-foreground"><tr><th className="px-1 py-2 font-medium">الوحدة</th><th className="px-1 py-2 font-medium">المساحة</th><th className="px-1 py-2 font-medium">السعر</th><th className="px-1 py-2 font-medium">الحالة</th></tr></thead>
        <tbody>
          {units.map((unit) => {
            const style = statusStyle(unit.status);
            const area = areaCol ? unit.extra?.[areaCol] : "";
            const price = priceCol ? unit.extra?.[priceCol] : "";
            return (
              <tr key={unit.id} onClick={() => onOpen(unit)} className={`cursor-pointer active:bg-muted/60 ${style.overlay}`}>
                <td className={`truncate border-r-4 bg-card px-1 py-2.5 font-bold ${style.border}`}>{unit.unit_number}</td>
                <td className="truncate bg-card px-1 py-2.5">{area || "—"}</td>
                <td className="truncate bg-card px-1 py-2.5">{style.hidePrice || !price ? <span className="text-muted-foreground">—</span> : <span className="font-bold text-brand">{price}</span>}</td>
                <td className="bg-card px-1 py-2.5"><StatusPill status={unit.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
