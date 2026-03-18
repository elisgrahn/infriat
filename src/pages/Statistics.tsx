import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { StatisticsCharts } from "@/components/StatisticsCharts";
import { EnhancedStatisticsCharts } from "@/components/EnhancedStatisticsCharts";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Promise {
  id: string;
  party_id: string;
  election_year: number;
  promise_text: string;
  status: 'infriat' | 'delvis-infriat' | 'utreds' | 'ej-infriat' | 'brutet' | 'pending-analysis';
  parties: {
    name: string;
    abbreviation: string;
  };
  created_at: string;
}

const Statistics = () => {
  const [promises, setPromises] = useState<Promise[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchPromises();
  }, []);

  const fetchPromises = async () => {
    try {
      const { data, error } = await supabase
        .from('promises')
        .select('*, parties(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromises(data || []);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-br from-primary via-primary-light to-primary-dark text-primary-foreground py-12">
        <div className="container mx-auto px-4 space-y-4">
          <div className="flex justify-center sm:justify-end">
            <Button asChild variant="secondary" className="gap-2">
              <Link to="/statistik/labb">
                <FlaskConical className="h-4 w-4" />
                Öppna diagramlabb
              </Link>
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-center">Statistik</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 space-y-8">
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">Laddar statistik...</p>
          </div>
        ) : (
          <>
            <EnhancedStatisticsCharts promises={promises} isAdmin={isAdmin} />
            <StatisticsCharts promises={promises} />
          </>
        )}
      </main>
    </div>
  );
};

export default Statistics;
