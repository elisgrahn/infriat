import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchPromises, promiseKeys } from "@/services/promises";
import { fulfilledShare, partySummaries, type AnalysedStatus } from "@/lib/partyStats";
import type { PromiseData } from "@/types/promise";
import { STATUS_CONFIG } from "@/config/badgeConfig";
import { getBadgeColor } from "@/utils/partyColors";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_BAR_ORDER: AnalysedStatus[] = [
  "infriat",
  "delvis-infriat",
  "utreds",
  "ej-infriat",
  "brutet",
];

export default function PartiesPage({
  initialPromises,
}: {
  initialPromises?: PromiseData[];
}) {
  const { data: promises = [], isLoading } = useQuery({
    queryKey: promiseKeys.all,
    queryFn: fetchPromises,
    initialData: initialPromises,
  });
  const summaries = partySummaries(promises);
  const analysedTotal = promises.filter((p) => p.status !== "pending-analysis").length;

  return (
    <div className="bg-background">
      <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Partiernas vallöften
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Översikt över riksdagspartiernas granskade vallöften —{" "}
            {analysedTotal} löften analyserade hittills. Välj ett parti för att
            se status per område, valår och enskilt löfte.
          </p>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[...summaries]
              .sort((a, b) => Number(b.stats.total > 0) - Number(a.stats.total > 0))
              .map(({ abbreviation, name, stats }) => {
              const share = fulfilledShare(stats);
              return (
                <Link
                  key={abbreviation}
                  to="/parti/$kort"
                  params={{ kort: abbreviation }}
                  className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full p-5 transition-shadow duration-300 group-hover:shadow-lg">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={getBadgeColor(name)}>
                        {abbreviation}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {stats.total} {stats.total === 1 ? "löfte" : "löften"}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold leading-snug text-foreground">
                      {name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {share != null
                        ? `${share} % av löftena infriade`
                        : "Inga analyserade löften ännu"}
                    </p>
                    <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-muted">
                      {STATUS_BAR_ORDER.map((status) => {
                        const count = stats[status];
                        if (!count || !stats.total) return null;
                        return (
                          <div
                            key={status}
                            title={STATUS_CONFIG[status].label}
                            style={{
                              width: `${(count / stats.total) * 100}%`,
                              backgroundColor: STATUS_CONFIG[status].chartColor,
                            }}
                          />
                        );
                      })}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
