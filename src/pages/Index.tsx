import { useState, useEffect } from "react";
import { PromiseCard } from "@/components/PromiseCard";
import { PromiseFilters } from "@/components/PromiseFilters";
import { ShieldCheck, Scale, TrendingUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Promise {
  id: string;
  party_id: string;
  election_year: number;
  promise_text: string;
  summary: string | null;
  direct_quote: string | null;
  measurability_reason: string | null;
  status: 'kept' | 'broken' | 'in-progress' | 'pending-analysis';
  status_explanation: string | null;
  status_sources: string[] | null;
  parties: {
    name: string;
    abbreviation: string;
  };
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [selectedParty, setSelectedParty] = useState("Alla");
  const [selectedStatus, setSelectedStatus] = useState("Alla");
  const [searchQuery, setSearchQuery] = useState("");
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
        .neq('status', 'pending-analysis')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromises(data || []);
    } catch (error) {
      console.error('Error fetching promises:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPromises = promises.filter((promise) => {
    const matchesParty = selectedParty === "Alla" || promise.parties.name === selectedParty;
    const matchesStatus =
      selectedStatus === "Alla" ||
      (selectedStatus === "Uppfyllt" && promise.status === "kept") ||
      (selectedStatus === "Brutet" && promise.status === "broken") ||
      (selectedStatus === "Pågående" && promise.status === "in-progress");
    const matchesSearch =
      searchQuery === "" ||
      promise.promise_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promise.parties.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesParty && matchesStatus && matchesSearch;
  });

  const stats = {
    total: promises.length,
    kept: promises.filter((p) => p.status === "kept").length,
    broken: promises.filter((p) => p.status === "broken").length,
    inProgress: promises.filter((p) => p.status === "in-progress").length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-primary via-primary-light to-primary-dark text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full border border-primary-foreground/20">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm font-medium">Politisk transparens</span>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Politiska Löften
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </div>
            
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
              Vi granskar svenska politiska partier och följer upp deras vallöften. 
              Transparens och ansvar är grunden för ett demokratiskt samhälle.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 max-w-3xl mx-auto">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Scale className="w-5 h-5" />
                  <div className="text-3xl font-bold">{stats.total}</div>
                </div>
                <div className="text-sm text-primary-foreground/80">Totalt antal löften</div>
              </div>
              
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <div className="text-3xl font-bold">{stats.kept}</div>
                </div>
                <div className="text-sm text-primary-foreground/80">Uppfyllda löften</div>
              </div>
              
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <div className="text-3xl font-bold">
                    {Math.round((stats.kept / stats.total) * 100)}%
                  </div>
                </div>
                <div className="text-sm text-primary-foreground/80">Uppfyllelsegrad</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8 bg-card rounded-xl p-6 border shadow-sm">
              <h2 className="text-xl font-bold mb-6 text-foreground">Filtrera</h2>
              <PromiseFilters
                selectedParty={selectedParty}
                selectedStatus={selectedStatus}
                searchQuery={searchQuery}
                onPartyChange={setSelectedParty}
                onStatusChange={setSelectedStatus}
                onSearchChange={setSearchQuery}
              />
            </div>
          </aside>

          {/* Promises List */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {filteredPromises.length} {filteredPromises.length === 1 ? "löfte" : "löften"}
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-16 bg-card rounded-xl border">
                <p className="text-muted-foreground text-lg">
                  Laddar löften...
                </p>
              </div>
            ) : filteredPromises.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border">
                <p className="text-muted-foreground text-lg">
                  Inga löften hittades som matchar dina filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPromises.map((promise) => (
                  <PromiseCard
                    key={promise.id}
                    promise={promise.promise_text}
                    party={promise.parties.name}
                    date={new Date(promise.created_at).toLocaleDateString('sv-SE')}
                    status={promise.status}
                    description={promise.summary || undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted mt-20 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            En plattform för att granska politiska löften och skapa transparens.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Byggt med öppenhet och ansvarstagande som grund.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
