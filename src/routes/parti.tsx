import { createFileRoute } from "@tanstack/react-router";
import { fetchPromises, promiseKeys } from "@/services/promises";
import PartiesPage from "@/pages/Parties";

const partyOverviewMeta = [
  { title: "Partiernas vallöften – översikt | Infriat" },
  {
    name: "description",
    content:
      "Översikt över riksdagspartiernas granskade vallöften: hur många löften varje parti har och hur stor andel som är infriad.",
  },
  { property: "og:title", content: "Partiernas vallöften – översikt | Infriat" },
  {
    property: "og:description",
    content:
      "Översikt över riksdagspartiernas granskade vallöften och hur stor andel som är infriad.",
  },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://infriat.se/parti" },
  { property: "og:image", content: "https://infriat.se/og-image.png" },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "Partiernas vallöften – översikt | Infriat" },
  {
    name: "twitter:description",
    content:
      "Översikt över riksdagspartiernas granskade vallöften och hur stor andel som är infriad.",
  },
  { name: "twitter:image", content: "https://infriat.se/og-image.png" },
];

export const Route = createFileRoute("/parti")({
  staticData: { sitemap: true },
  loader: ({ context }) =>
    context.queryClient
      .ensureQueryData({
        queryKey: promiseKeys.all,
        queryFn: fetchPromises,
        staleTime: 2 * 60 * 1000,
      })
      .catch(() => null),
  head: ({ matches }) => {
    // /parti is the parent of /parti/$kort; TanStack concatenates `links`
    // across matched routes, so only emit our canonical when /parti itself is
    // the deepest match. Meta entries are deduped by property, so the leaf
    // overrides them naturally.
    const isLeaf = !(matches as ReadonlyArray<{ routeId: string }>).some(
      (match) => match.routeId === "/parti/$kort",
    );
    return {
      meta: isLeaf ? partyOverviewMeta : [],
      links: isLeaf ? [{ rel: "canonical", href: "https://infriat.se/parti" }] : [],
    };
  },
  component: PartiOverviewRoute,
});

function PartiOverviewRoute() {
  const loaderData = Route.useLoaderData();
  return <PartiesPage initialPromises={loaderData ?? undefined} />;
}
