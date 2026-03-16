import {
  CircleCheckBig,
  SearchCheck,
  Search,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";

export type PromiseStatus =
  | "infriat"
  | "delvis-infriat"
  | "utreds"
  | "ej-infriat"
  | "brutet"
  | "pending-analysis";

export interface StatusConfigEntry {
  /** Swedish display label */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tooltip text shown on hover */
  tooltip: string;
  /** Tailwind classes for the badge (background + text + hover) */
  badgeClassName: string;
  /** Tailwind left-border colour class for the card */
  borderColor: string;
  /** Tailwind top-border colour class for drawer variant */
  topBorderColor: string;
  /** Tailwind hover background class for the card */
  cardHoverClassName: string;
  /** Tailwind focus-visible ring class for the card */
  cardFocusClassName: string;
  /** CSS colour used in recharts (hsl var or hex) */
  chartColor: string;
  /** Sort rank: lower = more fulfilled */
  sortRank: number;
}

export const STATUS_CONFIG: Record<PromiseStatus, StatusConfigEntry> = {
  infriat: {
    label: "Infriat",
    icon: CircleCheckBig,
    tooltip: "Löftet är helt genomfört – beslut fattat och målet uppnått",
    badgeClassName: "bg-emerald-700 text-white hover:bg-emerald-800",
    borderColor: "border-l-emerald-700",
    topBorderColor: "border-t-emerald-700",
    cardHoverClassName: "hover:bg-emerald-800/10",
    cardFocusClassName: "focus-visible:ring-emerald-700/60",
    chartColor: "#047857", // emerald-700
    sortRank: 1,
  },
  "delvis-infriat": {
    label: "Delvis infriat",
    icon: SearchCheck,
    tooltip:
      "Regeringen har vidtagit konkreta åtgärder, t.ex. lagt en proposition, ökat utbildningsplatser eller påbörjat reformen, men målet är inte helt nått",
    badgeClassName: "bg-emerald-400 text-white hover:bg-emerald-500",
    borderColor: "border-l-emerald-400",
    topBorderColor: "border-t-emerald-400",
    cardHoverClassName: "hover:bg-emerald-500/10",
    cardFocusClassName: "focus-visible:ring-emerald-500/60",
    chartColor: "#34d399", // emerald-400
    sortRank: 2,
  },
  utreds: {
    label: "Utreds",
    icon: Search,
    tooltip:
      "En utredning, departementspromemoria eller liknande arbete pågår för att möjliggöra reformen, men inga politiska beslut har fattats",
    badgeClassName: "bg-amber-500 text-white hover:bg-amber-600",
    borderColor: "border-l-amber-500",
    topBorderColor: "border-t-amber-500",
    cardHoverClassName: "hover:bg-amber-600/10",
    cardFocusClassName: "focus-visible:ring-amber-600/60",
    chartColor: "#f59e0b", // amber-500
    sortRank: 3,
  },
  "ej-infriat": {
    label: "Ej infriat",
    icon: SearchX,
    tooltip:
      "Inga tydliga steg mot genomförande har tagits, men regeringen sitter fortfarande kvar och kan agera",
    badgeClassName: "bg-gray-400 text-white hover:bg-gray-500",
    borderColor: "border-l-gray-400",
    topBorderColor: "border-t-gray-400",
    cardHoverClassName: "hover:bg-gray-500/10",
    cardFocusClassName: "focus-visible:ring-gray-500/60",
    chartColor: "#9ca3af", // gray-400
    sortRank: 4,
  },
  brutet: {
    label: "Brutet",
    icon: X,
    tooltip: "Regeringsperioden är avslutad och löftet har inte uppfyllts",
    badgeClassName: "bg-rose-700 text-white hover:bg-rose-800",
    borderColor: "border-l-rose-700",
    topBorderColor: "border-t-rose-700",
    cardHoverClassName: "hover:bg-rose-800/10",
    cardFocusClassName: "focus-visible:ring-rose-700/60",
    chartColor: "#be123c", // rose-700
    sortRank: 5,
  },
  "pending-analysis": {
    label: "Under analys",
    icon: Search,
    tooltip: "Löftets status analyseras för närvarande",
    badgeClassName: "bg-muted text-muted-foreground hover:bg-muted/90",
    borderColor: "border-l-muted",
    topBorderColor: "border-t-muted",
    cardHoverClassName: "hover:bg-muted/50",
    cardFocusClassName: "focus-visible:ring-muted-foreground/50",
    chartColor: "hsl(var(--muted-foreground))",
    sortRank: 6,
  },
};

/** All statuses except pending-analysis, in display order */
export const VISIBLE_STATUSES: PromiseStatus[] = [
  "infriat",
  "delvis-infriat",
  "utreds",
  "ej-infriat",
  "brutet",
];

/** Chart series label → status slug mapping (for TimelineComparison/charts) */
export const CHART_SERIES: Array<{
  key: PromiseStatus;
  label: string;
  chartLabel: string;
}> = [
  { key: "infriat", label: "Infriat", chartLabel: "Infriade" },
  { key: "delvis-infriat", label: "Delvis infriat", chartLabel: "Delvis infriade" },
  { key: "utreds", label: "Utreds", chartLabel: "Utreds" },
  { key: "ej-infriat", label: "Ej infriat", chartLabel: "Ej infriade" },
  { key: "brutet", label: "Brutet", chartLabel: "Brutna" },
  { key: "pending-analysis", label: "Under analys", chartLabel: "Under analys" },
];
