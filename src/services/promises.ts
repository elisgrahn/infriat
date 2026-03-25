import { supabase } from "@/integrations/supabase/client";
import type { PromiseData, GovernmentPeriod } from "@/types/promise";

// --- Query keys ---
export const promiseKeys = {
  all: ["promises"] as const,
  detail: (id: string) => ["promises", id] as const,
  governmentPeriods: ["government-periods"] as const,
};

// --- Fetch functions ---

export async function fetchPromises(): Promise<PromiseData[]> {
  const { data, error } = await supabase
    .from("promises")
    .select(
      "id, party_id, election_year, promise_text, summary, measurability_score, category, is_status_quo, status, page_number, manifest_pdf_url, direct_quote, status_tldr, created_at, updated_at, view_count, parties(name, abbreviation)",
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as PromiseData[]) || [];
}

export async function fetchGovernmentPeriods(): Promise<GovernmentPeriod[]> {
  const { data, error } = await supabase
    .from("government_periods")
    .select("*")
    .order("start_year", { ascending: true });

  if (error) throw error;
  return (data as GovernmentPeriod[]) || [];
}
