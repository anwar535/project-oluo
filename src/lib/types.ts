export type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  type: string | null;
  tagline: string | null;
  district: string | null;
  status: string;
  cover_image: string | null;
  sheet_tab: string | null;
  sort_order: number;
  columns: string[];
};

export type UnitRow = {
  id: string;
  project_id: string;
  unit_number: string;
  status: string;
  plan_image: string | null;
  sort_order: number;
  extra: Record<string, string>;
};

export const PROJECT_STATUSES = [
  "متاح للبيع",
  "البيع على الخارطة",
  "قريباً",
  "مُباع بالكامل",
] as const;

export const UNIT_STATUSES = ["متاح", "محجوز", "مباع"] as const;
