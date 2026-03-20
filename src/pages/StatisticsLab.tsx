import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ExperimentalCharts } from "@/components/ExperimentalCharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PromiseStatus } from "@/config/statusConfig";
import type { PolicyCategory } from "@/lib/promiseMetrics";

interface AnalyticsPromiseRow {
  id: string;
  election_year: number;
  status: PromiseStatus;
  measurability_score: number | null;
  category: PolicyCategory | null;
  is_status_quo: boolean;
  parties: {
    name: string;
    abbreviation: string;
  };
}

const StatisticsLab = () => {
  const [promises, setPromises] = useState<AnalyticsPromiseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchPromises = async () => {
      try {
        const { data, error } = await supabase
          .from("promises")
          .select("id, election_year, status, measurability_score, category, is_status_quo, parties(name, abbreviation)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPromises((data as AnalyticsPromiseRow[]) || []);
      } catch {
        setPromises([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromises();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-br from-primary via-primary-light to-primary-dark text-primary-foreground py-12">
        <div className="container mx-auto px-4 space-y-4">
          <Button asChild variant="secondary" size="sm" className="gap-2 w-fit">
            <Link to="/statistik">
              <ArrowLeft className="h-4 w-4" />
              Tillbaka till statistik
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-sm">
              <FlaskConical className="h-4 w-4" />
              Experimentella diagram
            </div>
            <h1 className="text-4xl font-bold">Diagramlabb</h1>
            <p className="max-w-2xl text-primary-foreground/85">
              En separat yta för att testa fler visualiseringar utan att röra de befintliga statistikdiagrammen.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[0, 1, 2].map((item) => (
              <Card
                key={item}
                className={cn("h-[420px] animate-pulse rounded-2xl", item === 2 && "xl:col-span-2")}
              />
            ))}
          </div>
        ) : (
          <ExperimentalCharts promises={promises} isAdmin={isAdmin} />
        )}
      </main>
    </div>
  );
};

export default StatisticsLab;
