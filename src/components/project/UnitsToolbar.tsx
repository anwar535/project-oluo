import { LayoutGrid, List, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_OPTS, statusBtnActive, type StatusFilter, type UnitSort } from "./unit-utils";

type Props = {
  search: string;
  onSearch: (value: string) => void;
  status: StatusFilter;
  onStatus: (value: StatusFilter) => void;
  sort: UnitSort;
  onSort: (value: UnitSort) => void;
  counts: Record<string, number>;
  floorValues: string[];
  floor: string;
  onFloor: (value: string) => void;
  roomValues: string[];
  rooms: string;
  onRooms: (value: string) => void;
  resultCount: number;
  total: number;
  hasActiveFilters: boolean;
  onReset: () => void;
  view: "grid" | "table";
  onView: (value: "grid" | "table") => void;
};

const sortOptions: { value: UnitSort; label: string }[] = [
  { value: "available", label: "المتاح أولاً" },
  { value: "area-asc", label: "المساحة تصاعدي" },
  { value: "area-desc", label: "المساحة تنازلي" },
  { value: "price-asc", label: "السعر تصاعدي" },
  { value: "price-desc", label: "السعر تنازلي" },
  { value: "unit", label: "رقم الوحدة" },
];

function QuickFilter({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  if (values.length < 2) return null;
  return (
    <div className="flex min-w-max items-center gap-1.5">
      <span className="ml-1 text-xs font-medium text-muted-foreground">{label}</span>
      {values.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={value === item}
          onClick={() => onChange(value === item ? "" : item)}
          className={`h-8 whitespace-nowrap rounded-full border px-3 text-xs transition ${value === item ? "border-brand bg-brand/10 text-brand" : "border-border bg-card hover:bg-muted"}`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function UnitsToolbar(props: Props) {
  return (
    <section className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl" aria-label="البحث وتصفية الوحدات">
      <div className="mx-auto max-w-7xl space-y-2.5 px-3 py-3 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">بحث في الوحدات</span>
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={props.search}
              onChange={(event) => props.onSearch(event.target.value)}
              placeholder="ابحث برقم الوحدة أو أي تفاصيل..."
              className="h-10 bg-card pr-9"
              type="search"
            />
          </label>
          <div className="flex gap-2">
            <Select value={props.sort} onValueChange={(value) => props.onSort(value as UnitSort)}>
              <SelectTrigger className="h-10 min-w-0 flex-1 bg-card sm:w-[180px]" aria-label="ترتيب الوحدات">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex h-10 shrink-0 overflow-hidden rounded-md border border-border bg-card">
              <button type="button" onClick={() => props.onView("grid")} aria-label="عرض البطاقات" title="عرض البطاقات" aria-pressed={props.view === "grid"} className={`w-10 ${props.view === "grid" ? "bg-navy text-navy-foreground" : "hover:bg-muted"}`}>
                <LayoutGrid className="mx-auto h-4 w-4" />
              </button>
              <button type="button" onClick={() => props.onView("table")} aria-label="عرض الجدول" title="عرض الجدول" aria-pressed={props.view === "table"} className={`w-10 ${props.view === "table" ? "bg-navy text-navy-foreground" : "hover:bg-muted"}`}>
                <List className="mx-auto h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STATUS_OPTS.map((status) => {
            const active = props.status === status;
            const count = status === "كل الحالات" ? props.total : props.counts[status] ?? 0;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                onClick={() => props.onStatus(status)}
                className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition ${active ? statusBtnActive(status) : "border-border bg-card hover:bg-muted"}`}
              >
                {status} <span className="tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {(props.floorValues.length >= 2 || props.roomValues.length >= 2) && (
          <div className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <QuickFilter label="الدور" values={props.floorValues} value={props.floor} onChange={props.onFloor} />
            <QuickFilter label="الغرف" values={props.roomValues} value={props.rooms} onChange={props.onRooms} />
          </div>
        )}

        <div className="flex min-h-7 items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">عدد النتائج <strong className="text-sm text-brand tabular-nums">{props.resultCount}</strong>{props.resultCount !== props.total && <span> من {props.total}</span>}</span>
          {props.hasActiveFilters && (
            <button type="button" onClick={props.onReset} className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> إعادة ضبط
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
