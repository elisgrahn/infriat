import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Government-period helpers ───────────────────────────────────────────────

export interface GovernmentPeriod {
  id: string;
  start_year: number;
  end_year: number | null;
  governing_parties: string[];
  support_parties: string[] | null;
}

/**
 * Returns the mandate type a party had as a *result* of a given election year.
 *
 * The key insight: a promise is made BEFORE an election. The relevant government
 * period is the one that STARTED at (or immediately after) that election year —
 * i.e. the period with the smallest start_year that is >= electionYear.
 *
 * Using partyName (Swedish full name) matching against governing_parties /
 * support_parties stored in the DB.
 */
export function getMandateType(
  partyName: string,
  electionYear: number,
  periods: GovernmentPeriod[],
): "governing" | "support" | "opposition" {
  // Find the period that started closest to (and not before) the election year
  const sorted = [...periods]
    .filter((p) => p.start_year >= electionYear)
    .sort((a, b) => a.start_year - b.start_year);

  const period = sorted[0] ?? null;

  if (!period) return "opposition";

  if (period.governing_parties.includes(partyName)) return "governing";
  if (period.support_parties?.includes(partyName)) return "support";
  return "opposition";
}

/**
 * Extract a user-friendly error message from a Supabase function invocation error.
 * supabase.functions.invoke() wraps errors in various shapes — this normalises them.
 */
export async function extractFunctionError(error: unknown): Promise<string> {
  if (!error) return 'Okänt fel';

  // FunctionsHttpError contains a Response-like context with JSON body
  if (error instanceof Error && 'context' in error) {
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) return body.error;
      }
    } catch { /* fall through */ }
  }

  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message);
  }
  return String(error);
}
