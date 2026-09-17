import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchGovernmentPeriods, fetchPromises, promiseKeys } from "@/services/promises";
import { computePartyStats, fulfilledShare } from "@/lib/partyStats";
import { PARTY_ABBREVIATION_TO_NAME } from "@/utils/partyAbbreviations";
import type { PromiseData, GovernmentPeriod } from "@/types/promise";
import PartyDetail from "@/pages/PartyDetail";

export const Route = createFileRoute("/parti/$kort")({
  staticData: { sitemap: true },
  beforeLoad: ({ params }) => {
    if (!PARTY_ABBREVIATION_TO_NAME[params.kort.toUpperCase()]) {
      throw notFound();
    }
  },
  loader: async ({ context }) => {
    // Seed both queries during SSR so the server-rendered HTML contains the
    // real numbers (and the client hydrates from identical data).
    const [promises, periods] = await Promise.all([
      context.queryClient
        .ensureQueryData({
          queryKey: promiseKeys.all,
          queryFn: fetchPromises,
          staleTime: 2 * 60 * 1000,
        })
        .catch((error) => {
          console.error("[parti] loader kunde inte hämta löften:", error);
          return null;
        }),
      context.queryClient
        .ensureQueryData({
          queryKey: promiseKeys.governmentPeriods,
          queryFn: fetchGovernmentPeriods,
          staleTime: 2 * 60 * 1000,
        })
        .catch(() => null),
    ]);
    return {
      promises: promises as PromiseData[] | null,
      periods: periods as GovernmentPeriod[] | null,
    };
  },
  head: ({ params, loaderData }) => {
    const abbreviation = params.kort.toUpperCase();
    const name = PARTY_ABBREVIATION_TO_NAME[abbreviation] ?? "Parti";
    const stats = computePartyStats(loaderData?.promises ?? [], name);
    const share = fulfilledShare(stats);
    const title = `${name} (${abbreviation}) – vallöften och uppföljning | Infriat`;
    const description = stats.total
      ? `Vi granskar ${stats.total} vallöften från ${name}${
          share != null ? ` – ${share} % är infriade` : ""
        }. Se status per politikområde, valår och enskilt löfte.`
      : stats.upcoming
        ? `${stats.upcoming} vallöften från ${name} håller på att analyseras. Följ granskningen löfte för löfte på Infriat.`
        : `Har ${name} infriat sina vallöften? Följ granskningen på Infriat.`;
    const url = `https://infriat.se/parti/${abbreviation}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:image", content: "https://infriat.se/og-image.png" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: "https://infriat.se/og-image.png" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PartyDetailRoute,
  notFoundComponent: PartyNotFound,
});

function PartyDetailRoute() {
  const { kort } = Route.useParams();
  const { promises, periods } = Route.useLoaderData();
  return (
    <PartyDetail
      kort={kort.toUpperCase()}
      initialPromises={promises ?? undefined}
      initialPeriods={periods ?? undefined}
    />
  );
}

function PartyNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">Partiet hittades inte</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Vi granskar för närvarande riksdagspartierna. Gå till översikten för att
        välja ett parti.
      </p>
      <a
        href="/parti"
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Till partiöversikten
      </a>
    </div>
  );
}
