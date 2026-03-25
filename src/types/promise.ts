import type { Database } from "@/integrations/supabase/types";

export type PolicyCategoryEnum = Database["public"]["Enums"]["policy_category"];

export interface PromiseData {
  id: string;
  party_id: string;
  election_year: number;
  promise_text: string;
  summary: string | null;
  direct_quote: string | null;
  measurability_score: number | null;
  category: PolicyCategoryEnum | null;
  is_status_quo: boolean;
  status:
    | "infriat"
    | "delvis-infriat"
    | "utreds"
    | "ej-infriat"
    | "brutet"
    | "pending-analysis";
  page_number: number | null;
  manifest_pdf_url: string | null;
  parties: {
    name: string;
    abbreviation: string;
  };
  status_tldr: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
}

export interface GovernmentPeriod {
  id: string;
  name: string;
  start_year: number;
  end_year: number | null;
  governing_parties: string[];
  support_parties: string[] | null;
}

export type GovernmentStatus = "governing" | "support" | "opposition";

export type SortOption = {
  value: string;
  label: string;
};

export const SORT_OPTIONS: SortOption[] = [
  { value: "created-desc", label: "Skapat datum (fallande)" },
  { value: "created-asc", label: "Skapat datum (stigande)" },
  { value: "popularity-desc", label: "Populärast" },
  { value: "year-desc", label: "Valår (fallande)" },
  { value: "year-asc", label: "Valår (stigande)" },
  { value: "measurability-desc", label: "Mätbart (högst först)" },
  { value: "measurability-asc", label: "Mätbart (lägst först)" },
  { value: "status-asc", label: "Status (infriade först)" },
  { value: "status-desc", label: "Status (brutna först)" },
] as const;

export interface SuggestionWithPromise {
  id: string;
  promise_id: string;
  suggested_status: string;
  explanation: string;
  sources: string[] | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
  promise_text: string;
  current_status: string;
  party_name: string;
}
