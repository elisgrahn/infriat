import { useState, useEffect } from "react";
import { PromiseCard } from "@/components/PromiseCard";
import { PromiseFilters } from "@/components/PromiseFilters";
import { PartyProgressBars } from "@/components/PartyProgressBars";
import { TimelineComparison } from "@/components/TimelineComparison";
import { HeroStatCard } from "@/components/HeroStatCard";
import { PromisePagination } from "@/components/PromisePagination";
import {
  ShieldCheck,
  Scale,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFilters } from "@/contexts/FilterContext";
import { PromiseDetailOverlay } from "@/components/PromiseDetailOverlay";

interface GovernmentPeriod {
  id: string;
  name: string;
  start_year: number;
  end_year: number | null;
  governing_parties: string[];
  support_parties: string[] | null;
}

interface Promise {
  id: string;
  party_id: string;
  election_year: number;
  promise_text: string;
  summary: string | null;
  direct_quote: string | null;
  measurability_reason: string | null;
  measurability_score: number | null;
  status:
    | "infriat"
    | "delvis-infriat"
    | "utreds"
    | "ej-infriat"
    | "brutet"
    | "pending-analysis";
  status_explanation: string | null;
  status_sources: string[] | null;
  page_number: number | null;
  manifest_pdf_url: string | null;
  parties: {
    name: string;
    abbreviation: string;
  };
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { id: legacyPromiseId } = useParams<{ id?: string }>();
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedPromiseId = searchParams.get("promise") ?? undefined;
  const {
    selectedParties,
    selectedStatuses,
    selectedGovStatus,
    searchQuery,
    sortBy,
    selectedPeriodId,
    governmentPeriods,
    setGovernmentPeriods,
  } = useFilters();

  const [promises, setPromises] = useState<Promise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Support legacy /lofte/:id deep-links by normalizing to query param
  useEffect(() => {
    if (legacyPromiseId && searchParams.get("promise") !== legacyPromiseId) {
      navigate(`/?promise=${legacyPromiseId}`, { replace: true });
    }
  }, [legacyPromiseId, searchParams, navigate]);

  useEffect(() => {
    fetchPromises();
    fetchGovernmentPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPromises = async () => {
    try {
      const { data, error } = await supabase
        .from("promises")
        .select("*, parties(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPromises(data || []);
    } catch (error) {
      // Silently handle error - data already initialized to empty array
    } finally {
      setLoading(false);
    }
  };

  const fetchGovernmentPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("government_periods")
        .select("*")
        .order("start_year", { ascending: true });

      if (error) throw error;
      setGovernmentPeriods(data || []);
    } catch (error) {
      // Silently handle error
    }
  };

  const getGovernmentStatus = (
    partyName: string,
    electionYear: number,
  ): "governing" | "opposition" => {
    // If a specific period is selected, use that period's data
    if (selectedPeriodId) {
      const period = governmentPeriods.find((p) => p.id === selectedPeriodId);
      if (!period) return "opposition";
      return period.governing_parties.includes(partyName) ||
        period.support_parties?.includes(partyName)
        ? "governing"
        : "opposition";
    }

    // Otherwise, find the period based on election year
    const period = governmentPeriods.find(
      (p) =>
        electionYear >= p.start_year &&
        (p.end_year === null || electionYear <= p.end_year),
    );

    if (!period) return "opposition";

    return period.governing_parties.includes(partyName) ||
      period.support_parties?.includes(partyName)
      ? "governing"
      : "opposition";
  };

  const filteredPromises = promises.filter((promise) => {
    // Hide "pending-analysis" status from non-admins
    if (promise.status === "pending-analysis" && !isAdmin) {
      return false;
    }

    const matchesParty =
      selectedParties.length === 0 ||
      selectedParties.includes(promise.parties.name);

    const statusMap: Record<string, string> = {
      Infriat: "infriat",
      "Delvis infriat": "delvis-infriat",
      Utreds: "utreds",
      "Ej infriat": "ej-infriat",
      Brutet: "brutet",
    };

    const matchesStatus =
      selectedStatuses.length === 0 ||
      selectedStatuses.some((status) => statusMap[status] === promise.status);

    const govStatus = getGovernmentStatus(
      promise.parties.name,
      promise.election_year,
    );
    const matchesGovStatus =
      selectedGovStatus.length === 0 || selectedGovStatus.includes(govStatus);

    const matchesSearch =
      searchQuery === "" ||
      promise.promise_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promise.parties.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by selected period
    let matchesPeriod = true;
    if (selectedPeriodId) {
      const period = governmentPeriods.find((p) => p.id === selectedPeriodId);
      if (period) {
        matchesPeriod =
          promise.election_year >= period.start_year &&
          (period.end_year === null ||
            promise.election_year <= period.end_year);
      }
    }

    return (
      matchesParty &&
      matchesStatus &&
      matchesGovStatus &&
      matchesSearch &&
      matchesPeriod
    );
  });

  const sortedPromises = [...filteredPromises].sort((a, b) => {
    // Status ranking based on filter button order
    const statusRank: Record<string, number> = {
      infriat: 1,
      "delvis-infriat": 2,
      utreds: 3,
      "ej-infriat": 4,
      brutet: 5,
      "pending-analysis": 6,
    };

    switch (sortBy) {
      case "created-desc":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "created-asc":
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "year-desc":
        return b.election_year - a.election_year;
      case "year-asc":
        return a.election_year - b.election_year;
      case "measurability-desc":
        return (b.measurability_score || 0) - (a.measurability_score || 0);
      case "measurability-asc":
        return (a.measurability_score || 0) - (b.measurability_score || 0);
      case "status-asc":
        return statusRank[a.status] - statusRank[b.status];
      case "status-desc":
        return statusRank[b.status] - statusRank[a.status];
      default:
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedPromises.length / ITEMS_PER_PAGE);
  const paginatedPromises = sortedPromises.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedParties,
    selectedStatuses,
    selectedGovStatus,
    searchQuery,
    sortBy,
    selectedPeriodId,
  ]);

  // Filter out pending-analysis for non-admins in stats
  const statsPromises = isAdmin
    ? promises
    : promises.filter((p) => p.status !== "pending-analysis");

  const stats = {
    total: statsPromises.length,
    fulfilled: statsPromises.filter((p) => p.status === "infriat").length,
    partiallyFulfilled: statsPromises.filter(
      (p) => p.status === "delvis-infriat",
    ).length,
    broken: statsPromises.filter((p) => p.status === "brutet").length,
    inProgress: statsPromises.filter((p) => p.status === "utreds").length,
    delayed: statsPromises.filter((p) => p.status === "ej-infriat").length,
  };

  const selectedPromiseStatus = promises.find(
    (promise) => promise.id === selectedPromiseId,
  )?.status;

  return (
    <>
      <div className="bg-background">
        {/* Hero Section */}
        <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary-dark text-primary-foreground">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-foreground rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-10 right-20 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-primary-foreground/20 shadow-lg">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">Politisk transparens</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-foreground via-primary-foreground to-primary-foreground/80 drop-shadow-lg">
              Infriat
            </h1>

            <p className="text-xl md:text-2xl text-primary-foreground/95 max-w-3xl mx-auto leading-relaxed font-light">
              Vi granskar svenska politiska partier och följer upp deras
              vallöften. Transparens och ansvar är grunden för ett demokratiskt
              samhälle.
            </p>

            <div className="grid grid-cols-3 gap-2 sm:gap-6 pt-12 max-w-4xl mx-auto">
              <HeroStatCard
                icon={Scale}
                value={stats.total}
                label="Antal löften"
              />
              <HeroStatCard
                icon={ShieldCheck}
                value={stats.fulfilled}
                label="Infriade löften"
              />
              <HeroStatCard
                icon={TrendingUp}
                value={`${stats.total > 0 ? Math.round((stats.fulfilled / stats.total) * 100) : 0}%`}
                label="Uppfyllelsegrad"
              />
            </div>
          </div>
        </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Party Comparison - Full Width Above Filters */}
          <div className="lg:col-span-4">
            <TimelineComparison
              promises={filteredPromises}
              governmentPeriods={governmentPeriods}
            />
          </div>

          {/* Filters Sidebar (desktop) */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-[72px] bg-card rounded-xl p-6 border shadow-sm">
              <h2 className="text-xl font-bold mb-6 text-foreground">
                Filtrera
              </h2>
              <PromiseFilters />
            </div>
          </aside>

          {/* Promises List */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {sortedPromises.length}{" "}
                {sortedPromises.length === 1 ? "löfte" : "löften"}
              </h2>

              <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="gap-2 lg:hidden">
                    <SlidersHorizontal className="w-4 h-4" />
                    Filtrera
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[85vh]">
                  <DrawerHeader>
                    <DrawerTitle>Filtrera löften</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-6 overflow-y-auto">
                    <PromiseFilters />
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            {loading ? (
              <div className="text-center py-16 bg-card rounded-xl border">
                <p className="text-muted-foreground text-lg">
                  Laddar löften...
                </p>
              </div>
            ) : sortedPromises.length === 0 ? (
              <div className="text-center py-16 bg-card rounded-xl border">
                <p className="text-muted-foreground text-lg">
                  Inga löften hittades som matchar dina filter.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedPromises.map((promise) => (
                    <div key={promise.id}>
                      <PromiseCard
                        promiseId={promise.id}
                        promise={promise.promise_text}
                        party={promise.parties.name}
                        electionYear={promise.election_year}
                        governmentStatus={getGovernmentStatus(
                          promise.parties.name,
                          promise.election_year,
                        )}
                        createdAt={new Date(
                          promise.created_at,
                        ).toLocaleDateString("sv-SE")}
                        updatedAt={new Date(
                          promise.updated_at,
                        ).toLocaleDateString("sv-SE")}
                        status={promise.status}
                        description={promise.summary || undefined}
                        statusExplanation={
                          promise.status_explanation || undefined
                        }
                        statusSources={promise.status_sources || undefined}
                        directQuote={promise.direct_quote || undefined}
                        pageNumber={promise.page_number || undefined}
                        manifestPdfUrl={promise.manifest_pdf_url || undefined}
                        measurabilityScore={
                          promise.measurability_score || undefined
                        }
                        onStatusUpdate={fetchPromises}
                      />
                    </div>
                  ))}
                </div>

                <PromisePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
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

      <PromiseDetailOverlay
        promiseId={selectedPromiseId}
        initialStatus={selectedPromiseStatus}
        onClose={() => navigate("/")}
      />
    </>
  );
};

export default Index;
