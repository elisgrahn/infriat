import type { PromiseData, } from "@/types/promise";
import type { PromiseStatus } from "@/config/badgeConfig";
import { PARTY_ABBREVIATION_TO_NAME } from "@/utils/partyAbbreviations";

export const PARTY_ORDER = ["V", "S", "MP", "C", "L", "KD", "M", "SD"] as const;
export type PartyAbbreviation = (typeof PARTY_ORDER)[number];

/** Statuses counted as "analysed" (visible to everyone) */
export type AnalysedStatus = Exclude<PromiseStatus, "pending-analysis">;

export const ANALYSED_STATUSES: AnalysedStatus[] = [
  "infriat",
  "delvis-infriat",
  "utreds",
  "ej-infriat",
  "brutet",
];

export interface PartyStats {
  /** Analysed promises (excludes pending-analysis) */
  total: number;
  /** Promises awaiting analysis ("Kommande val") */
  upcoming: number;
  infriat: number;
  "delvis-infriat": number;
  utreds: number;
  "ej-infriat": number;
  brutet: number;
}

const EMPTY_STATS: PartyStats = {
  total: 0,
  upcoming: 0,
  infriat: 0,
  "delvis-infriat": 0,
  utreds: 0,
  "ej-infriat": 0,
  brutet: 0,
};

export function computePartyStats(promises: PromiseData[], partyName: string): PartyStats {
  const stats: PartyStats = { ...EMPTY_STATS };
  for (const promise of promises) {
    if (promise.parties?.name !== partyName) continue;
    if (promise.status === "pending-analysis") {
      stats.upcoming++;
      continue;
    }
    if ((ANALYSED_STATUSES as string[]).includes(promise.status)) {
      stats[promise.status as keyof Omit<PartyStats, "total" | "upcoming">]++;
      stats.total++;
    }
  }
  return stats;
}

export interface PartySummary {
  abbreviation: PartyAbbreviation;
  name: string;
  stats: PartyStats;
}

export function partySummaries(promises: PromiseData[]): PartySummary[] {
  return PARTY_ORDER.map((abbreviation) => {
    const name = PARTY_ABBREVIATION_TO_NAME[abbreviation];
    return { abbreviation, name, stats: computePartyStats(promises, name) };
  });
}

/** Share of analysed promises that are fully fulfilled, in percent (or null when nothing analysed) */
export function fulfilledShare(stats: PartyStats): number | null {
  if (!stats.total) return null;
  return Math.round((stats.infriat / stats.total) * 100);
}
