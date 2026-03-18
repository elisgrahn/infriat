import {
  HeartHandshake,
  Stethoscope,
  GraduationCap,
  Globe,
  Scale,
  Shield,
  Leaf,
  House,
  Landmark,
  Circle,
  BriefcaseBusiness,
  Footprints,
  MoveRight,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Enums } from "@/integrations/supabase/types";
import { LaneChange } from "@/components/icons/LaneChange";

/**
 * Category is derived directly from the DB enum so it stays in sync.
 * If you rename / add a value in the Supabase migration the TypeScript
 * compiler will flag every place that's missing a case.
 */
export type Category = Enums<"policy_category">;

export interface CategoryConfigEntry {
  label: string;
  icon: LucideIcon;
  /** Tailwind text-colour class used for the badge icon */
  colorClass: string;
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfigEntry> = {
  valfard: {
    label: "Välfärd & omsorg",
    icon: HeartHandshake,
    colorClass: "text-pink-500",
  },
  halsa: {
    label: "Hälso- & sjukvård",
    icon: Stethoscope,
    colorClass: "text-red-500",
  },
  utbildning: {
    label: "Utbildning & forskning",
    icon: GraduationCap,
    colorClass: "text-sky-500",
  },
  arbetsmarknad: {
    label: "Arbetsmarknad & ekonomi",
    icon: BriefcaseBusiness,
    colorClass: "text-amber-600",
  },
  migration: {
    label: "Migration & integration",
    icon: Footprints,
    colorClass: "text-teal-500",
  },
  rattssakerhet: {
    label: "Rättsväsende & säkerhet",
    icon: Scale,
    colorClass: "text-indigo-500",
  },
  forsvar: {
    label: "Försvar & utrikes",
    icon: Shield,
    colorClass: "text-slate-600",
  },
  "klimat-miljo": {
    label: "Klimat & miljö",
    icon: Leaf,
    colorClass: "text-green-600",
  },
  bostad: {
    label: "Bostad & samhällsbyggnad",
    icon: House,
    colorClass: "text-orange-500",
  },
  demokrati: {
    label: "Demokrati & konstitution",
    icon: Landmark,
    colorClass: "text-violet-500",
  },
  ovrigt: {
    label: "Övrigt",
    icon: Circle,
    colorClass: "text-muted-foreground",
  },
};

export interface StatusQuoConfigEntry {
  icon: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  description: string;
  colorClass: string;
}

export const STATUS_QUO_CONFIG: Record<"true" | "false", StatusQuoConfigEntry> =
  {
    true: {
      icon: MoveRight,
      label: "Bevarandelöfte",
      description: "Partiet lovar att behålla något som redan finns",
      colorClass: "text-slate-500",
    },
    false: {
      icon: LaneChange, // Custom icon
      label: "Förändringslöfte",
      description: "Partiet lovar att förändra något",
      colorClass: "text-blue-500",
    },
  };
