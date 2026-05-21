import { UNITS, type Unit } from "./units";

export type Status = "متاح للبيع" | "البيع على الخارطة" | "قريباً" | "مُباع بالكامل";

export type Project = {
  id: string;
  slug: string;
  name: string;
  category: string; // English category label (Apartments / Villas)
  type: string; // Arabic type
  tagline: string;
  district: string;
  status: Status;
  image: string;
};

export const PROJECTS: Project[] = [
  {
    id: "16",
    slug: "oluo-16",
    name: "مشروع علو 16",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-%D9%A1%D9%A6%D9%A4-scaled.jpeg",
  },
  {
    id: "17",
    slug: "oluo-17",
    name: "مشروع علو 17",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B4%D9%A1%D9%A7.jpg",
  },
  {
    id: "18",
    slug: "oluo-18",
    name: "مشروع علو 18",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "مُباع بالكامل",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D9%A2.jpg",
  },
  {
    id: "19",
    slug: "oluo-19",
    name: "مشروع علو 19",
    category: "Villas",
    type: "فلل سكنية فاخرة",
    tagline: "فلل سكنية فاخرة بتصاميم عصرية ومساحات واسعة",
    district: "حي النرجس",
    status: "مُباع بالكامل",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-19-copy-2-e1776593918813.jpg",
  },
  {
    id: "20",
    slug: "oluo-20",
    name: "مشروع علو 20",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "قريباً",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/b1-e1776594534348.jpg",
  },
  {
    id: "22",
    slug: "oluo-22",
    name: "مشروع علو 22",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "مجمع شقق سكنية فاخرة بتشطيبات راقية وموقع متميز",
    district: "الرياض",
    status: "متاح للبيع",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/%D8%B9%D9%84%D9%88-%D9%A2%D9%A2%D9%A5.jpg",
  },
  {
    id: "23",
    slug: "oluo-23",
    name: "مشروع علو 23",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "مُباع بالكامل",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/02/JPG-4-e1776593998863.jpg",
  },
  {
    id: "24",
    slug: "oluo-24",
    name: "مشروع علو 24",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "مُباع بالكامل",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/0_55-Photo.jpg",
  },
  {
    id: "25",
    slug: "oluo-25",
    name: "مشروع علو 25",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "مُباع بالكامل",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/1_1-Photo-e1776598058388.jpg",
  },
  {
    id: "27",
    slug: "oluo-27",
    name: "مشروع علو 27",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "مُباع بالكامل",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/03/0_59-Photo.jpg",
  },
  {
    id: "28",
    slug: "oluo-28",
    name: "مشروع علو 28",
    category: "Apartments",
    type: "شقق سكنية فاخرة",
    tagline: "شقق سكنية فاخرة",
    district: "حي العقيق - الرياض",
    status: "متاح للبيع",
    image:
      "https://ahmed71.azq1.com/ioluo/wp-content/uploads/2026/02/%D9%86%D8%B3%D8%AE%D8%A9-%D9%85%D9%86-q5-1.jpg",
  },
];

export function projectUnits(id: string): Unit[] {
  return UNITS[id] ?? [];
}

export function projectCounts(id: string) {
  const units = projectUnits(id);
  const available = units.filter((u) => u.status === "متاح").length;
  return { total: units.length, available };
}
