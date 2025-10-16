import { useState, useEffect } from "react";
import { StatisticsCharts } from "@/components/StatisticsCharts";
import { EnhancedStatisticsCharts } from "@/components/EnhancedStatisticsCharts";
import { supabase } from "@/integrations/supabase/client";

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
        <div className="container mx-auto px-4">
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
            <EnhancedStatisticsCharts promises={promises} />
            <StatisticsCharts promises={promises} />
          </>
        )}
      </main>
    </div>
  );
};

export default Statistics;
