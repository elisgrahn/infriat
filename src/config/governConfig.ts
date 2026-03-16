import {
  ThumbsUp,
  ThumbsDown,
  Handshake,
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
}

export const STATUS_CONFIG: Record<PromiseStatus, StatusConfigEntry> = {
  infriat: {
    label: "Infriat",
    icon: CircleCheckBig,
    tooltip: "Löftet är helt genomfört – beslut fattat och målet uppnått",
    badgeClassName: "bg-emerald-700 text-white hover:bg-emerald-800",
  },
  "delvis-infriat": {
    label: "Delvis infriat",
    icon: SearchCheck,
    tooltip:
      "Regeringen har vidtagit konkreta åtgärder, t.ex. lagt en proposition, ökat utbildningsplatser eller påbörjat reformen, men målet är inte helt nått",
    badgeClassName: "bg-emerald-400 text-white hover:bg-emerald-500",
  },
  utreds: {
    label: "Utreds",
    icon: Search,
    tooltip:
      "En utredning, departementspromemoria eller liknande arbete pågår för att möjliggöra reformen, men inga politiska beslut har fattats",
    badgeClassName: "bg-amber-500 text-white hover:bg-amber-600",
  },
  "ej-infriat": {
    label: "Ej infriat",
    icon: SearchX,
    tooltip:
      "Inga tydliga steg mot genomförande har tagits, men regeringen sitter fortfarande kvar och kan agera",
    badgeClassName: "bg-gray-400 text-white hover:bg-gray-500",
  },
  brutet: {
    label: "Brutet",
    icon: X,
    tooltip: "Regeringsperioden är avslutad och löftet har inte uppfyllts",
    badgeClassName: "bg-rose-700 text-white hover:bg-rose-800",
  },
  "pending-analysis": {
    label: "Under analys",
    icon: Search,
    tooltip: "Löftets status analyseras för närvarande",
    badgeClassName: "bg-muted text-muted-foreground hover:bg-muted/90",
  },
};
