import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { EnhancedStatisticsCharts } from "@/components/EnhancedStatisticsCharts";
import { ExperimentalCharts } from "@/components/ExperimentalCharts";
import { Separator } from "@/components/ui/separator";
import { fetchPromises, promiseKeys } from "@/services/promises";
import type { PromiseStatus } from "@/config/statusConfig";
import type { PolicyCategory } from "@/lib/promiseMetrics";

interface AnalyticsPromise {
  id: string;
  party_id: string;
  election_year: number;
  promise_text: string;
  status: PromiseStatus;
  measurability_score: number | null;
  category: PolicyCategory | null;
  is_status_quo: boolean | null;
  parties: {
    name: string;
    abbreviation: string;
  };
  created_at: string;
}

const Statistics = () => {
  const { isAdmin } = useAuth();

  const { data: promises = [], isLoading: loading } = useQuery({
    queryKey: promiseKeys.all,
    queryFn: fetchPromises,
    staleTime: 2 * 60 * 1000,
    // The shared fetchPromises returns PromiseData which is a superset — cast here
    select: (data) => data as unknown as AnalyticsPromise[],
  });

  // All charts only show analysed promises (never pending-analysis), unless admin
  const analysedPromises = promises.filter(
    (p) => isAdmin || p.status !== "pending-analysis",
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-br from-primary via-primary-light to-primary-dark text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center">Statistik</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-12">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Laddar statistik...</p>
          </div>
        ) : (
          <>
            <EnhancedStatisticsCharts promises={analysedPromises} isAdmin={isAdmin} />
            <Separator />
            <ExperimentalCharts promises={analysedPromises} isAdmin={isAdmin} />
          </>
        )}
      </main>
    </div>
  );
};

export default Statistics;

