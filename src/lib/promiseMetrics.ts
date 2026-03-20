import { STATUS_CONFIG, type PromiseStatus } from "@/config/badgeConfig";

export type PolicyCategory =
  | "valfard"
  | "halsa"
  | "utbildning"
  | "arbetsmarknad"
  | "migration"
  | "rattssakerhet"
  | "forsvar"
  | "klimat-miljo"
  | "bostad"
  | "demokrati"
  | "ovrigt";

export interface AnalyticsPromise {
  id?: string;
  election_year: number;
  status: PromiseStatus;
  measurability_score: number | null;
  category?: PolicyCategory | null;
  is_status_quo?: boolean | null;
  parties: {
    name: string;
    abbreviation: string;
  };
  summary?: string | null;
  direct_quote?: string | null;
  status_explanation?: string | null;
  page_number?: number | null;
  manifest_pdf_url?: string | null;
}

export interface PromiseProfileSource {
  status: PromiseStatus;
  measurability_score: number | null;
  category?: PolicyCategory | null;
  is_status_quo?: boolean | null;
  summary?: string | null;
  direct_quote?: string | null;
  status_explanation?: string | null;
  page_number?: number | null;
  manifest_pdf_url?: string | null;
}

export interface PartyStatusRadarRow {
  party: string;
  total: number;
  infriat: number;
  "delvis-infriat": number;
  utreds: number;
  "ej-infriat": number;
  brutet: number;
}

export const PARTY_ORDER = ["V", "S", "MP", "C", "L", "KD", "M", "SD"] as const;

export const POLICY_CATEGORY_ORDER: PolicyCategory[] = [
  "valfard",
  "halsa",
  "utbildning",
  "arbetsmarknad",
  "migration",
  "rattssakerhet",
  "forsvar",
  "klimat-miljo",
  "bostad",
  "demokrati",
  "ovrigt",
];

export const POLICY_CATEGORY_LABELS: Record<PolicyCategory, string> = {
  valfard: "Välfärd",
  halsa: "Hälsa",
  utbildning: "Utbildning",
  arbetsmarknad: "Arbetsmarknad",
  migration: "Migration",
  rattssakerhet: "Rättssäkerhet",
  forsvar: "Försvar",
  "klimat-miljo": "Klimat & miljö",
  bostad: "Bostad",
  demokrati: "Demokrati",
  ovrigt: "Övrigt",
};

export const CHARTABLE_STATUSES: Array<Exclude<PromiseStatus, "pending-analysis">> = [
  "infriat",
  "delvis-infriat",
  "utreds",
  "ej-infriat",
  "brutet",
];

const statusScoreMap: Record<PromiseStatus, number> = {
  infriat: 5,
  "delvis-infriat": 4,
  utreds: 3,
  "ej-infriat": 2,
  brutet: 1,
  "pending-analysis": 0,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const round = (value: number, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const sortByPartyOrder = <T extends { party: string }>(rows: T[]) =>
  [...rows].sort((a, b) => {
    const aIndex = PARTY_ORDER.indexOf(a.party as (typeof PARTY_ORDER)[number]);
    const bIndex = PARTY_ORDER.indexOf(b.party as (typeof PARTY_ORDER)[number]);

    if (aIndex === -1 && bIndex === -1) return a.party.localeCompare(b.party, "sv");
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

export function getStatusScore(status: PromiseStatus) {
  return statusScoreMap[status] ?? 0;
}

export function getMeasurabilityScore(score: number | null | undefined) {
  return clamp(score ?? 0, 0, 5);
}

export function getEvidenceScore(citationCount: number) {
  return clamp(citationCount, 0, 5);
}

export function getDocumentationScore(promise: PromiseProfileSource) {
  const points = [
    promise.summary,
    promise.direct_quote,
    promise.status_explanation,
    promise.page_number,
    promise.manifest_pdf_url,
  ].filter(Boolean).length;

  return clamp(points, 0, 5);
}

export function buildPromiseProfileRadarData(
  promise: PromiseProfileSource,
  citationCount: number,
) {
  return [
    {
      metric: "Status",
      value: getStatusScore(promise.status),
      fullMark: 5,
      description: STATUS_CONFIG[promise.status].label,
    },
    {
      metric: "Mätbarhet",
      value: getMeasurabilityScore(promise.measurability_score),
      fullMark: 5,
      description:
        promise.measurability_score === null
          ? "Saknar värde"
          : `${promise.measurability_score}/5`,
    },
    {
      metric: "Källstöd",
      value: getEvidenceScore(citationCount),
      fullMark: 5,
      description: `${citationCount} källa${citationCount === 1 ? "" : "or"}`,
    },
    {
      metric: "Dokumentation",
      value: getDocumentationScore(promise),
      fullMark: 5,
      description: "Bygger på citat, sammanfattning och underlag",
    },
  ];
}

export function buildPartyStatusRadarData(
  promises: AnalyticsPromise[],
  mode: "share" | "count" = "share",
): PartyStatusRadarRow[] {
  const grouped = promises.reduce(
    (acc, promise) => {
      const party = promise.parties.abbreviation;
      if (!acc[party]) {
        acc[party] = {
          party,
          total: 0,
          statuses: {
            infriat: 0,
            "delvis-infriat": 0,
            utreds: 0,
            "ej-infriat": 0,
            brutet: 0,
          },
        };
      }

      acc[party].total += 1;
      if (promise.status !== "pending-analysis") {
        acc[party].statuses[promise.status] += 1;
      }

      return acc;
    },
    {} as Record<
      string,
      {
        party: string;
        total: number;
        statuses: Record<Exclude<PromiseStatus, "pending-analysis">, number>;
      }
    >,
  );

  return sortByPartyOrder(
    Object.values(grouped).map((entry) => ({
      party: entry.party,
      total: entry.total,
      infriat:
        mode === "share" && entry.total > 0
          ? round((entry.statuses.infriat / entry.total) * 100)
          : entry.statuses.infriat,
      "delvis-infriat":
        mode === "share" && entry.total > 0
          ? round((entry.statuses["delvis-infriat"] / entry.total) * 100)
          : entry.statuses["delvis-infriat"],
      utreds:
        mode === "share" && entry.total > 0
          ? round((entry.statuses.utreds / entry.total) * 100)
          : entry.statuses.utreds,
      "ej-infriat":
        mode === "share" && entry.total > 0
          ? round((entry.statuses["ej-infriat"] / entry.total) * 100)
          : entry.statuses["ej-infriat"],
      brutet:
        mode === "share" && entry.total > 0
          ? round((entry.statuses.brutet / entry.total) * 100)
          : entry.statuses.brutet,
    })),
  );
}

export function buildAverageMeasurabilityByParty(promises: AnalyticsPromise[]) {
  const grouped = promises.reduce(
    (acc, promise) => {
      if (promise.measurability_score === null) return acc;

      const party = promise.parties.abbreviation;
      if (!acc[party]) {
        acc[party] = { party, total: 0, measured: 0, sum: 0 };
      }

      acc[party].total += 1;
      acc[party].measured += 1;
      acc[party].sum += promise.measurability_score;
      return acc;
    },
    {} as Record<string, { party: string; total: number; measured: number; sum: number }>,
  );

  return sortByPartyOrder(
    Object.values(grouped).map((entry) => ({
      party: entry.party,
      average: round(entry.sum / entry.measured, 2),
      measured: entry.measured,
      total: entry.total,
    })),
  );
}

export function buildAverageMeasurabilityByCategory(promises: AnalyticsPromise[]) {
  const grouped = promises.reduce(
    (acc, promise) => {
      if (!promise.category || promise.measurability_score === null) return acc;

      if (!acc[promise.category]) {
        acc[promise.category] = { category: promise.category, measured: 0, sum: 0 };
      }

      acc[promise.category].measured += 1;
      acc[promise.category].sum += promise.measurability_score;
      return acc;
    },
    {} as Record<PolicyCategory, { category: PolicyCategory; measured: number; sum: number }>,
  );

  return POLICY_CATEGORY_ORDER.filter((category) => accessoryHasOwn(grouped, category)).map((category) => ({
    category,
    label: POLICY_CATEGORY_LABELS[category],
    average: round(grouped[category].sum / grouped[category].measured, 2),
    measured: grouped[category].measured,
  }));
}

export function buildStatusQuoBreakdownByParty(promises: AnalyticsPromise[]) {
  const grouped = promises.reduce(
    (acc, promise) => {
      const party = promise.parties.abbreviation;
      if (!acc[party]) {
        acc[party] = { party, total: 0, statusQuo: 0, change: 0 };
      }

      acc[party].total += 1;
      if (promise.is_status_quo) {
        acc[party].statusQuo += 1;
      } else {
        acc[party].change += 1;
      }

      return acc;
    },
    {} as Record<string, { party: string; total: number; statusQuo: number; change: number }>,
  );

  return sortByPartyOrder(
    Object.values(grouped).map((entry) => ({
      ...entry,
      statusQuoShare: entry.total > 0 ? round((entry.statusQuo / entry.total) * 100) : 0,
      changeShare: entry.total > 0 ? round((entry.change / entry.total) * 100) : 0,
    })),
  );
}

export function buildPartyPerformanceScatterData(promises: AnalyticsPromise[]) {
  const grouped = promises.reduce(
    (acc, promise) => {
      const party = promise.parties.abbreviation;
      if (!acc[party]) {
        acc[party] = {
          party,
          total: 0,
          measured: 0,
          statusSum: 0,
          measurabilitySum: 0,
        };
      }

      acc[party].total += 1;
      acc[party].statusSum += getStatusScore(promise.status);

      if (promise.measurability_score !== null) {
        acc[party].measured += 1;
        acc[party].measurabilitySum += promise.measurability_score;
      }

      return acc;
    },
    {} as Record<
      string,
      {
        party: string;
        total: number;
        measured: number;
        statusSum: number;
        measurabilitySum: number;
      }
    >,
  );

  return sortByPartyOrder(
    Object.values(grouped)
      .filter((entry) => entry.measured > 0)
      .map((entry) => ({
        party: entry.party,
        avgStatus: round(entry.statusSum / entry.total, 2),
        avgMeasurability: round(entry.measurabilitySum / entry.measured, 2),
        total: entry.total,
      })),
  );
}

function accessoryHasOwn<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export interface CategoryStatusRadarRow {
  category: PolicyCategory;
  label: string;
  total: number;
  infriat: number;
  "delvis-infriat": number;
  utreds: number;
  "ej-infriat": number;
  brutet: number;
}

/**
 * Builds radar data where each row is a policy category and each key is a
 * status value (as a percentage share of that category's analysed promises).
 */
export function buildStatusByCategoryRadarData(
  promises: AnalyticsPromise[],
  mode: "share" | "count" = "share",
): CategoryStatusRadarRow[] {
  const grouped = promises.reduce(
    (acc, promise) => {
      if (!promise.category || promise.status === "pending-analysis") return acc;

      const cat = promise.category;
      if (!acc[cat]) {
        acc[cat] = {
          category: cat,
          total: 0,
          statuses: {
            infriat: 0,
            "delvis-infriat": 0,
            utreds: 0,
            "ej-infriat": 0,
            brutet: 0,
          },
        };
      }

      acc[cat].total += 1;
      acc[cat].statuses[promise.status as Exclude<PromiseStatus, "pending-analysis">] += 1;
      return acc;
    },
    {} as Record<
      PolicyCategory,
      {
        category: PolicyCategory;
        total: number;
        statuses: Record<Exclude<PromiseStatus, "pending-analysis">, number>;
      }
    >,
  );

  return POLICY_CATEGORY_ORDER.map((cat) => {
    const entry = grouped[cat];
    const total = entry?.total ?? 0;
    const statuses = entry?.statuses ?? {
      infriat: 0,
      "delvis-infriat": 0,
      utreds: 0,
      "ej-infriat": 0,
      brutet: 0,
    };
    const val = (status: Exclude<PromiseStatus, "pending-analysis">) =>
      mode === "share" && total > 0
        ? round((statuses[status] / total) * 100)
        : statuses[status];

    return {
      category: cat,
      label: POLICY_CATEGORY_LABELS[cat],
      total,
      infriat: val("infriat"),
      "delvis-infriat": val("delvis-infriat"),
      utreds: val("utreds"),
      "ej-infriat": val("ej-infriat"),
      brutet: val("brutet"),
    };
  });
}
