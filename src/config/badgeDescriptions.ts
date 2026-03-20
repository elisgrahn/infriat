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
  Heart,
  GraduationCap,
  Briefcase,
  Globe,
  Scale,
  Shield,
  Leaf,
  Home,
  Landmark,
  MoreHorizontal,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { LaneChange } from "@/components/icons/LaneChange";

export interface BadgeVariantDescription {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  colorClass?: string;
}

export interface BadgeCategory {
  title: string;
  anchor: string;
  intro: string;
  variants: BadgeVariantDescription[];
}

export const STATUS_VARIANTS: BadgeVariantDescription[] = [
  {
    key: "infriat",
    label: "Infriat",
    description:
      "Löftet är helt genomfört – beslut har fattats och det utlovade målet har uppnåtts. Exempelvis har en lag trätt i kraft eller en reform genomförts fullt ut.",
    icon: CircleCheckBig,
    colorClass: "bg-emerald-700 text-white",
  },
  {
    key: "delvis-infriat",
    label: "Delvis infriat",
    description:
      "Regeringen har vidtagit konkreta åtgärder – t.ex. lagt en proposition, ökat utbildningsplatser eller påbörjat reformen – men målet är inte helt nått ännu.",
    icon: SearchCheck,
    colorClass: "bg-emerald-400 text-white",
  },
  {
    key: "utreds",
    label: "Utreds",
    description:
      "En utredning, departementspromemoria eller liknande arbete pågår för att möjliggöra reformen, men inga politiska beslut har fattats.",
    icon: Search,
    colorClass: "bg-amber-500 text-white",
  },
  {
    key: "ej-infriat",
    label: "Ej infriat",
    description:
      "Inga tydliga steg mot genomförande har tagits, men regeringen sitter fortfarande kvar och kan agera. Löftet kan fortfarande infrias.",
    icon: SearchX,
    colorClass: "bg-gray-400 text-white",
  },
  {
    key: "brutet",
    label: "Brutet",
    description:
      "Regeringsperioden är avslutad och löftet uppfylldes aldrig. Statusen sätts retroaktivt när mandatperioden löpt ut utan att löftet genomförts.",
    icon: X,
    colorClass: "bg-rose-700 text-white",
  },
];

export const GOVERNMENT_VARIANTS: BadgeVariantDescription[] = [
  {
    key: "governing",
    label: "Regering",
    description:
      "Partiet ingår i den regering som bildades efter valet. Regeringspartier har direkt möjlighet att genomdriva sina vallöften genom propositioner och budgetförslag.",
    icon: ThumbsUp,
    colorClass: "bg-blue-600 text-white",
  },
  {
    key: "support",
    label: "Stödparti",
    description:
      "Partiet stödjer regeringen utan att sitta i den. Stödpartier kan påverka politiken genom förhandlingar och avtal, men har inte samma direkta makt som regeringspartier.",
    icon: Handshake,
    colorClass: "bg-blue-400 text-white",
  },
  {
    key: "opposition",
    label: "Opposition",
    description:
      "Partiet tillhör oppositionen och har begränsade möjligheter att genomdriva sina vallöften. Oppositionspartier kan påverka genom motioner och debatt.",
    icon: ThumbsDown,
    colorClass: "bg-slate-600 text-white",
  },
];

export const MEASURABILITY_VARIANTS: BadgeVariantDescription[] = [
  {
    key: "5",
    label: "5/5 – Extremt mätbart",
    description:
      "Löftet innehåller specifika siffror och en tidsram, t.ex. 'Öka antalet poliser med 10 000 till 2025'. Enklast att verifiera objektivt.",
    icon: Ruler,
    colorClass: "text-emerald-600",
  },
  {
    key: "4",
    label: "4/5 – Mycket mätbart",
    description:
      "Konkreta mål eller tidsram finns, t.ex. 'Bygga nya kärnkraftverk'. Saknar exakt siffra men åtgärden är verifierbar.",
    icon: Ruler,
    colorClass: "text-emerald-500",
  },
  {
    key: "3",
    label: "3/5 – Måttligt mätbart",
    description:
      "En tydlig, verifierbar åtgärd beskrivs men utan specifika mätetal, t.ex. 'Införa språkkrav för medborgarskap'.",
    icon: Ruler,
    colorClass: "text-amber-500",
  },
  {
    key: "2",
    label: "2/5 – Svagt mätbart",
    description:
      "Löftet talar om relativa förändringar utan tydliga mått, t.ex. 'Stärka försvaret'. Svårare att avgöra om det uppfyllts.",
    icon: Ruler,
    colorClass: "text-orange-500",
  },
  {
    key: "1",
    label: "1/5 – Nästan omätbart",
    description:
      "Vaga formuleringar utan konkreta mål, t.ex. 'Verka för ett tryggare Sverige'. Mycket svårt att objektivt verifiera.",
    icon: Ruler,
    colorClass: "text-rose-500",
  },
];

export const STATUS_QUO_VARIANTS: BadgeVariantDescription[] = [
  {
    key: "true",
    label: "Bevara",
    description:
      "Löftet handlar om att bibehålla nuvarande politik eller system. Partiet lovar att inte ändra på något, t.ex. 'Behålla RUT-avdraget'.",
    icon: MoveRight,
  },
  {
    key: "false",
    label: "Förändra",
    description:
      "Löftet handlar om att genomföra en förändring jämfört med nuläget. Partiet vill införa något nytt eller avskaffa något befintligt.",
    icon: LaneChange as ComponentType<{ className?: string }>,
  },
];

export const CATEGORY_VARIANTS: BadgeVariantDescription[] = [
  {
    key: "valfard",
    label: "Välfärd",
    description: "Övergripande välfärdspolitik – socialförsäkringar, pensioner, äldreomsorg och ekonomisk trygghet.",
    icon: Heart,
  },
  {
    key: "halsa",
    label: "Hälsa & sjukvård",
    description: "Sjukvårdspolitik – vårdköer, primärvård, psykisk hälsa och folkhälsa.",
    icon: Stethoscope,
  },
  {
    key: "utbildning",
    label: "Utbildning",
    description: "Skola, högskola och forskning – lärarlöner, betygssystem, universitetsplatser.",
    icon: GraduationCap,
  },
  {
    key: "arbetsmarknad",
    label: "Arbetsmarknad",
    description: "Sysselsättning, arbetsrätt, integration på arbetsmarknaden och a-kassa.",
    icon: Briefcase,
  },
  {
    key: "migration",
    label: "Migration",
    description: "Invandring, asylpolitik, uppehållstillstånd och integration.",
    icon: Globe,
  },
  {
    key: "rattssakerhet",
    label: "Rättssäkerhet",
    description: "Polis, domstolar, kriminalvård, straff och brottsbekämpning.",
    icon: Scale,
  },
  {
    key: "forsvar",
    label: "Försvar",
    description: "Militärt försvar, NATO, totalförsvar och civilförsvar.",
    icon: Shield,
  },
  {
    key: "klimat-miljo",
    label: "Klimat & miljö",
    description: "Klimatpolitik, energiomställning, naturskydd och hållbar utveckling.",
    icon: Leaf,
  },
  {
    key: "bostad",
    label: "Bostad",
    description: "Bostadsbyggande, hyresmarknad, bostadsbidrag och stadsplanering.",
    icon: Home,
  },
  {
    key: "demokrati",
    label: "Demokrati",
    description: "Grundlagsfrågor, yttrandefrihet, kommunalt självstyre och mediepolitik.",
    icon: Landmark,
  },
  {
    key: "ovrigt",
    label: "Övrigt",
    description: "Löften som inte faller inom någon av de andra kategorierna.",
    icon: MoreHorizontal,
  },
];

/** All badge categories for the /om page */
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
