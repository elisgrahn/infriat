import { ComponentType } from "react";
import {
  CircleCheckBig,
  SearchCheck,
  Search,
  SearchX,
  X,
  ThumbsUp,
  ThumbsDown,
  Handshake,
  Ruler,
  MoveRight,
  HeartHandshake,
  Stethoscope,
  GraduationCap,
  Scale,
  Shield,
  Leaf,
  House,
  Landmark,
  Ellipsis,
  BriefcaseBusiness,
  Footprints,
  type LucideIcon,
} from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";
import { LaneChange } from "@/components/icons/LaneChange";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface BadgeVariant {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  /** Full Tailwind classes for the badge itself (bg + text + hover etc.) */
  badgeClass?: string;
  /**
   * The "special" color for this variant expressed as Tailwind border + tint
   * classes, used to style the tooltip Item border.
   * e.g. "border-emerald-700 bg-emerald-700/10"
   */
  itemClass?: string;
}

export interface BadgeCategory {
  title: string;
  anchor: string;
  intro: string;
  variants: BadgeVariant[];
}

// ─── PromiseStatus ─────────────────────────────────────────────────────────────

export type PromiseStatus =
  | "infriat"
  | "delvis-infriat"
  | "utreds"
  | "ej-infriat"
  | "brutet"
  | "pending-analysis";

export interface StatusConfigEntry {
  label: string;
  icon: LucideIcon;
  tooltip: string;
  badgeClassName: string;
  borderColor: string;
  topBorderColor: string;
  cardHoverClassName: string;
  cardFocusClassName: string;
  chartColor: string;
  sortRank: number;
}

export const STATUS_CONFIG: Record<PromiseStatus, StatusConfigEntry> = {
  infriat: {
    label: "Infriat",
    icon: CircleCheckBig,
    tooltip: "Löftet är helt genomfört, beslut har fattats och det utlovade målet har uppnåtts. Ex. har en lag trätt i kraft eller en reform genomförts fullt ut.",
    badgeClassName: "bg-emerald-700 text-white hover:bg-emerald-800",
    borderColor: "border-l-emerald-700",
    topBorderColor: "border-t-emerald-700",
    cardHoverClassName: "hover:bg-emerald-800/10",
    cardFocusClassName: "focus-visible:ring-emerald-700/60",
    chartColor: "#047857",
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
    chartColor: "#34d399",
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
    chartColor: "#f59e0b",
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
    chartColor: "#9ca3af",
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
    chartColor: "#be123c",
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

export const VISIBLE_STATUSES: PromiseStatus[] = [
  "infriat",
  "delvis-infriat",
  "utreds",
  "ej-infriat",
  "brutet",
];

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

// ─── Category ──────────────────────────────────────────────────────────────────

export type Category = Enums<"policy_category">;

export interface CategoryConfigEntry {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfigEntry> = {
  valfard: {
    label: "Välfärd & omsorg",
    icon: HeartHandshake,
    badgeClass: "text-pink-500",
  },
  halsa: {
    label: "Hälso- & sjukvård",
    icon: Stethoscope,
    badgeClass: "text-red-500",
  },
  utbildning: {
    label: "Utbildning & forskning",
    icon: GraduationCap,
    badgeClass: "text-sky-500",
  },
  arbetsmarknad: {
    label: "Arbetsmarknad & ekonomi",
    icon: BriefcaseBusiness,
    badgeClass: "text-amber-600",
  },
  migration: {
    label: "Migration & integration",
    icon: Footprints,
    badgeClass: "text-teal-500",
  },
  rattssakerhet: {
    label: "Rättsväsende & säkerhet",
    icon: Scale,
    badgeClass: "text-indigo-500",
  },
  forsvar: {
    label: "Försvar & utrikes",
    icon: Shield,
    badgeClass: "text-slate-600",
  },
  "klimat-miljo": {
    label: "Klimat & miljö",
    icon: Leaf,
    badgeClass: "text-green-600",
  },
  bostad: {
    label: "Bostad & samhällsbyggnad",
    icon: House,
    badgeClass: "text-orange-500",
  },
  demokrati: {
    label: "Demokrati & konstitution",
    icon: Landmark,
    badgeClass: "text-violet-500",
  },
  ovrigt: {
    label: "Övrigt",
    icon: Ellipsis,
    badgeClass: "text-muted-foreground",
  },
};

export interface StatusQuoConfigEntry {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  description: string;
  badgeClass: string;
}

export const STATUS_QUO_CONFIG: Record<"true" | "false", StatusQuoConfigEntry> = {
  true: {
    icon: MoveRight,
    label: "Bevara",
    description: "Partiet lovar att behålla något som redan finns",
    badgeClass: "text-muted-foreground",
  },
  false: {
    icon: LaneChange as ComponentType<{ className?: string }>,
    label: "Förändra",
    description: "Partiet lovar att förändra något",
    badgeClass: "text-card-foreground",
  },
};

// ─── Badge variants (for tooltip/about page) ──────────────────────────────────
// `itemClass` drives the colored border on the tooltip Item.
// For status/government: the badge background color → border + tint.
// For measurability/category/statusQuo: the badge text color → border + tint.

export const STATUS_VARIANTS: BadgeVariant[] = [
  {
    key: "infriat",
    label: "Infriat",
    description:
      "Partiet har helt infriat löftet, beslut har fattats och det utlovade målet har uppnåtts. T.ex. har en lag trätt i kraft eller en reform genomförts fullt ut.",
    icon: CircleCheckBig,
    badgeClass: "bg-emerald-700 text-white",
    itemClass: "border-emerald-700 bg-emerald-700/10",
  },
  {
    key: "delvis-infriat",
    label: "Delvis infriat",
    description:
      "Partiet har vidtagit konkreta åtgärder för att infria löftet, men målet är inte helt uppnått ännu. T.ex. har en lag trätt i kraft eller en reform påbörjats.",
    icon: SearchCheck,
    badgeClass: "bg-emerald-400 text-white",
    itemClass: "border-emerald-400 bg-emerald-400/10",
  },
  {
    key: "utreds",
    label: "Utreds",
    description:
      "Partiet har initierat en utredning, departementspromemoria eller liknande arbete för att infria löftet, men inga politiska beslut har fattats än.",
    icon: Search,
    badgeClass: "bg-amber-500 text-white",
    itemClass: "border-amber-500 bg-amber-500/10",
  },
  {
    key: "ej-infriat",
    label: "Ej infriat",
    description:
      "Partiet har inte tagit några tydliga steg mot att infria löftet, men regeringen sitter fortfarande kvar och kan agera. Löftet kan fortfarande infrias.",
    icon: SearchX,
    badgeClass: "bg-gray-400 text-white",
    itemClass: "border-gray-400 bg-gray-400/10",
  },
  {
    key: "brutet",
    label: "Brutet",
    description:
      "Regeringsperioden är avslutad och löftet uppfylldes aldrig. Statusen sätts retroaktivt när mandatperioden löpt ut utan att löftet genomförts.",
    icon: X,
    badgeClass: "bg-rose-700 text-white",
    itemClass: "border-rose-700 bg-rose-700/10",
  },
];

export const GOVERNMENT_VARIANTS: BadgeVariant[] = [
  {
    key: "governing",
    label: "Regering",
    description:
      "Partiet ingick i regeringen efter valet som löftet gavs inför. Regeringspartier har direkt möjlighet att genomdriva sina vallöften genom propositioner och budgetförslag.",
    icon: ThumbsUp,
    badgeClass: "bg-blue-600 text-white",
    itemClass: "border-blue-600 bg-blue-600/10",
  },
  {
    key: "support",
    label: "Stödparti",
    description:
      "Partiet stöttade regeringen, utan att ingå i den, efter valet som löftet gavs inför. Stödpartier kan påverka politiken genom förhandlingar och avtal, men har inte samma direkta makt som regeringspartier.",
    icon: Handshake,
    badgeClass: "bg-blue-400 text-white",
    itemClass: "border-blue-400 bg-blue-400/10",
  },
  {
    key: "opposition",
    label: "Opposition",
    description:
      "Partiet tillhörde oppositionen efter valet som löftet gavs inför. Oppositionspartier har begränsade möjligheter att driva igenom sina vallöften, men kan påverka politiken genom motioner och debatt.",
    icon: ThumbsDown,
    badgeClass: "bg-slate-600 text-white",
    itemClass: "border-slate-600 bg-slate-600/10",
  },
];

export const MEASURABILITY_VARIANTS: BadgeVariant[] = [
  {
    key: "5",
    label: "Extremt mätbart: 5/5",
    description:
      "Löftet innehåller både ett konkret mål och en tidsram, t.ex. 'Anställa 10 000 fler poliser före 2026'.",
    icon: Ruler,
    badgeClass: "text-emerald-600",
    itemClass: "border-emerald-600 bg-emerald-600/10",
  },
  {
    key: "4",
    label: "Mycket mätbart: 4/5",
    description:
      "Löftet innehåller antingen ett konkret mål eller en tidsram, men inte båda, t.ex. 'Bygga 50 000 nya bostäder', 'Halvera sjukvårdsköerna före 2027'.",
    icon: Ruler,
    badgeClass: "text-emerald-500",
    itemClass: "border-emerald-500 bg-emerald-500/10",
  },
  {
    key: "3",
    label: "Måttligt mätbart: 3/5",
    description:
      "Löftet beskriver en tydligt verifierbar åtgärd utan specifika mätetal, t.ex. 'Avskaffa värnskatten', 'Införa obligatorisk läsning i lågstadiet'.",
    icon: Ruler,
    badgeClass: "text-amber-500",
    itemClass: "border-amber-500 bg-amber-500/10",
  },
  {
    key: "2",
    label: "Svagt mätbart: 2/5",
    description:
      "Löftet innehåller enbart relativa förändringar utan specifika mätetal, t.ex. 'Sänka skatten för pensionärer', 'Öka anslagen till försvaret'.",
    icon: Ruler,
    badgeClass: "text-orange-500",
    itemClass: "border-orange-500 bg-orange-500/10",
  },
  {
    key: "1",
    label: "Nästan omätbart: 1/5",
    description:
      "Vaga formuleringar utan konkreta mål eller åtgärder, t.ex. 'Värna om välfärden', 'Skapa ett bättre Sverige'.",
    icon: Ruler,
    badgeClass: "text-rose-500",
    itemClass: "border-rose-500 bg-rose-500/10",
  },
];

export const STATUS_QUO_VARIANTS: BadgeVariant[] = [
  {
    key: "false",
    label: "Förändra",
    description:
      "Löftet kräver en förändring jämfört med nuläget, t.ex. 'Införa X', 'Minska Y'.",
    icon: LaneChange as ComponentType<{ className?: string }>,
    itemClass: "border-foreground bg-foreground/10",
  },
  {
    key: "true",
    label: "Bevara",
    description:
      "Löftet bevarar nuvarande politik eller system, t.ex. 'Behålla X', 'Värna Y'.",
    icon: MoveRight,
    itemClass: "border-muted-foreground bg-muted-foreground/10",
  },
];

export const CATEGORY_VARIANTS: BadgeVariant[] = [
  {
    key: "valfard",
    label: "Välfärd & omsorg",
    description: "Ex. socialförsäkringar, pensioner, äldreomsorg och ekonomisk trygghet.",
    icon: HeartHandshake,
    badgeClass: "text-pink-500",
    itemClass: "border-pink-500 bg-pink-500/10",
  },
  {
    key: "halsa",
    label: "Hälso- & sjukvård",
    description: "Ex. sjukvårdspolitik, vårdköer, primärvård, psykisk hälsa och folkhälsa.",
    icon: Stethoscope,
    badgeClass: "text-red-500",
    itemClass: "border-red-500 bg-red-500/10",
  },
  {
    key: "utbildning",
    label: "Utbildning & forskning",
    description: "Ex. skolpolitik, högre utbildning, forskning och innovation.",
    icon: GraduationCap,
    badgeClass: "text-sky-500",
    itemClass: "border-sky-500 bg-sky-500/10",
  },
  {
    key: "arbetsmarknad",
    label: "Arbetsmarknad & ekonomi",
    description: "Ex. sysselsättning, arbetsrätt, integration på arbetsmarknaden och a-kassa.",
    icon: BriefcaseBusiness,
    badgeClass: "text-amber-600",
    itemClass: "border-amber-600 bg-amber-600/10",
  },
  {
    key: "migration",
    label: "Migration & integration",
    description: "Ex. invandring, integration, asylpolitik och uppehållstillstånd.",
    icon: Footprints,
    badgeClass: "text-teal-500",
    itemClass: "border-teal-500 bg-teal-500/10",
  },
  {
    key: "rattssakerhet",
    label: "Rättsväsende & säkerhet",
    description: "Ex. polis, domstolar, kriminalvård, straff och brottsbekämpning.",
    icon: Scale,
    badgeClass: "text-indigo-500",
    itemClass: "border-indigo-500 bg-indigo-500/10",
  },
  {
    key: "forsvar",
    label: "Försvar & utrikes",
    description: "Ex. militärt försvar, NATO, totalförsvar och civilförsvar.",
    icon: Shield,
    badgeClass: "text-slate-600",
    itemClass: "border-slate-600 bg-slate-600/10",
  },
  {
    key: "klimat-miljo",
    label: "Klimat & miljö",
    description: "Ex. klimatpolitik, energiomställning, naturskydd och hållbar utveckling.",
    icon: Leaf,
    badgeClass: "text-green-600",
    itemClass: "border-green-600 bg-green-600/10",
  },
  {
    key: "bostad",
    label: "Bostad & samhällsbyggnad",
    description: "Ex. bostadsbyggande, hyresmarknad, bostadsbidrag och stadsplanering.",
    icon: House,
    badgeClass: "text-orange-500",
    itemClass: "border-orange-500 bg-orange-500/10",
  },
  {
    key: "demokrati",
    label: "Demokrati & konstitution",
    description: "Ex. grundlagsfrågor, yttrandefrihet, kommunalt självstyre och mediepolitik.",
    icon: Landmark,
    badgeClass: "text-violet-500",
    itemClass: "border-violet-500 bg-violet-500/10",
  },
  {
    key: "ovrigt",
    label: "Övrigt",
    description: "Löften som inte faller inom någon av de andra kategorierna.",
    icon: Ellipsis,
    badgeClass: "text-muted-foreground",
    itemClass: "border-muted-foreground bg-muted-foreground/10",
  },
];

// ─── All badge categories (for the /om page) ──────────────────────────────────

export const ALL_BADGE_CATEGORIES: BadgeCategory[] = [
  {
    title: "Status",
    anchor: "status",
    intro:
      "Varje vallöfte får en av fem statusar baserat på vad som faktiskt har hänt sedan valet. Statusen sätts med hjälp av AI-analys och verifieras mot offentliga källor.",
    variants: STATUS_VARIANTS,
  },
  {
    title: "Partiroll",
    anchor: "parti-roll",
    intro:
      "Partiets roll i riksdagen efter det val då löftet gavs avgör hur stor möjlighet partiet har att genomdriva sitt löfte.",
    variants: GOVERNMENT_VARIANTS,
  },
  {
    title: "Mätbarhet",
    anchor: "matbarhet",
    intro:
      "Mätbarhetspoängen (1–5) anger hur konkret och verifierbart ett löfte är formulerat. Ju högre poäng, desto lättare är det att objektivt avgöra om löftet har uppfyllts.",
    variants: MEASURABILITY_VARIANTS,
  },
  {
    title: "Typ av löfte",
    anchor: "typ",
    intro:
      "Löften delas in i två typer beroende på om partiet vill bevara status quo eller förändra något.",
    variants: STATUS_QUO_VARIANTS,
  },
  {
    title: "Politikområde",
    anchor: "politikomrade",
    intro:
      "Varje löfte kategoriseras efter det politikområde det berör. Kategoriseringen görs med hjälp av AI-analys.",
    variants: CATEGORY_VARIANTS,
  },
];
