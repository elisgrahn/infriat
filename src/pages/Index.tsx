import { useState, useEffect, useRef } from "react";
import { PromiseCard } from "@/components/PromiseCard";
import { PromiseFilters } from "@/components/PromiseFilters";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShieldCheck, Scale, TrendingUp, Settings, LogIn, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  status: 'fulfilled' | 'partially-fulfilled' | 'in-progress' | 'delayed' | 'broken' | 'unclear' | 'pending-analysis';
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
  const { user, isAdmin, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const promiseRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const [selectedParties, setSelectedParties] = useState<string[]>(() => {
    const parties = searchParams.get('parties');
    return parties ? parties.split(',') : [];
  });
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const statuses = searchParams.get('statuses');
    return statuses ? statuses.split(',') : [];
  });
  const [selectedGovStatus, setSelectedGovStatus] = useState<string[]>(() => {
    const govStatus = searchParams.get('govStatus');
    return govStatus ? govStatus.split(',') : [];
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || "");
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || "created-desc");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(() => searchParams.get('period') || null);
  const [promises, setPromises] = useState<Promise[]>([]);
  const [governmentPeriods, setGovernmentPeriods] = useState<GovernmentPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const handleAuthClick = async () => {
    if (user) {
      await signOut();
    } else {
      navigate('/auth');
    }
  };

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    // Update or remove filter params
    if (selectedParties.length > 0) {
      params.set('parties', selectedParties.join(','));
    } else {
      params.delete('parties');
    }
    
    if (selectedStatuses.length > 0) {
      params.set('statuses', selectedStatuses.join(','));
    } else {
      params.delete('statuses');
    }
    
    if (selectedGovStatus.length > 0) {
      params.set('govStatus', selectedGovStatus.join(','));
    } else {
      params.delete('govStatus');
    }
    
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    
    if (sortBy !== 'created-desc') {
      params.set('sort', sortBy);
    } else {
      params.delete('sort');
    }
    
    if (selectedPeriodId) {
      params.set('period', selectedPeriodId);
    } else {
      params.delete('period');
    }
    
    setSearchParams(params, { replace: true });
  }, [selectedParties, selectedStatuses, selectedGovStatus, searchQuery, sortBy, selectedPeriodId]);

  // Scroll to promise if ID in URL - wait until promises are loaded
  useEffect(() => {
    if (loading || promises.length === 0) return;
    
    const promiseId = searchParams.get('promise');
    if (promiseId && promiseRefs.current[promiseId]) {
      // Give some time for rendering
      const timer = setTimeout(() => {
        promiseRefs.current[promiseId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loading, promises, searchParams]);

  useEffect(() => {
    fetchPromises();
    fetchGovernmentPeriods();
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
      // Silently handle error - data already initialized to empty array
    } finally {
      setLoading(false);
    }
  };

  const fetchGovernmentPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('government_periods')
        .select('*')
        .order('start_year', { ascending: true });

      if (error) throw error;
      setGovernmentPeriods(data || []);
    } catch (error) {
      // Silently handle error
    }
  };

  const getGovernmentStatus = (partyName: string, electionYear: number): 'governing' | 'opposition' => {
    const period = governmentPeriods.find(p => 
      electionYear >= p.start_year && (p.end_year === null || electionYear <= p.end_year)
    );
    
    if (!period) return 'opposition';
    
    return period.governing_parties.includes(partyName) ? 'governing' : 'opposition';
  };

  const filteredPromises = promises.filter((promise) => {
    const matchesParty = selectedParties.length === 0 || selectedParties.includes(promise.parties.name);
    
    const statusMap: Record<string, string> = {
      "Infriat": "fulfilled",
      "Delvis infriat": "partially-fulfilled",
      "Pågående": "in-progress",
      "Försenat": "delayed",
      "Brutet": "broken",
      "Oklart": "unclear"
    };
    
    const matchesStatus = selectedStatuses.length === 0 || 
      selectedStatuses.some(status => statusMap[status] === promise.status);
    
    const govStatus = getGovernmentStatus(promise.parties.name, promise.election_year);
    const matchesGovStatus = selectedGovStatus.length === 0 || selectedGovStatus.includes(govStatus);
    
    const matchesSearch =
      searchQuery === "" ||
      promise.promise_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promise.parties.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesParty && matchesStatus && matchesGovStatus && matchesSearch;
  });

  const sortedPromises = [...filteredPromises].sort((a, b) => {
    // Status ranking based on filter button order
    const statusRank: Record<string, number> = {
      'fulfilled': 1,
      'partially-fulfilled': 2,
      'in-progress': 3,
      'delayed': 4,
      'broken': 5,
      'unclear': 6,
      'pending-analysis': 7
    };

    switch (sortBy) {
      case "created-desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "created-asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
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
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedPromises.length / ITEMS_PER_PAGE);
  const paginatedPromises = sortedPromises.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedParties, selectedStatuses, selectedGovStatus, searchQuery, sortBy, selectedPeriodId]);

  const stats = {
    total: promises.length,
    fulfilled: promises.filter((p) => p.status === "fulfilled").length,
    partiallyFulfilled: promises.filter((p) => p.status === "partially-fulfilled").length,
    broken: promises.filter((p) => p.status === "broken").length,
    inProgress: promises.filter((p) => p.status === "in-progress").length,
    delayed: promises.filter((p) => p.status === "delayed").length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary-dark text-primary-foreground">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-foreground rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-primary-foreground/20 shadow-lg">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-medium">Politisk transparens</span>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-foreground via-primary-foreground to-primary-foreground/80 drop-shadow-lg">
                Infriat
              </h1>
              <div className="flex gap-2">
                <ThemeToggle />
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/admin")}
                    className="text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm transition-all"
                    title="Admin"
                  >
                    <Settings className="w-6 h-6" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAuthClick}
                  className="text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm transition-all"
                  title={user ? 'Logga ut' : 'Logga in'}
                >
                  {user ? <LogOut className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                </Button>
              </div>
            </div>
            
            <p className="text-xl md:text-2xl text-primary-foreground/95 max-w-3xl mx-auto leading-relaxed font-light">
              Vi granskar svenska politiska partier och följer upp deras vallöften. 
              Transparens och ansvar är grunden för ett demokratiskt samhälle.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 max-w-4xl mx-auto">
              <div className="group bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-8 border border-primary-foreground/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Scale className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  <div className="text-4xl font-bold">{stats.total}</div>
                </div>
                <div className="text-sm text-primary-foreground/90 font-medium">Totalt antal löften</div>
              </div>
              
              <div className="group bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-8 border border-primary-foreground/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <ShieldCheck className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="text-4xl font-bold">{stats.fulfilled}</div>
                </div>
                <div className="text-sm text-primary-foreground/90 font-medium">Infriade löften</div>
              </div>
              
              <div className="group bg-primary-foreground/10 backdrop-blur-md rounded-2xl p-8 border border-primary-foreground/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <TrendingUp className="w-6 h-6 group-hover:translate-y-[-4px] transition-transform" />
                  <div className="text-4xl font-bold">
                    {Math.round((stats.fulfilled / stats.total) * 100)}%
                  </div>
                </div>
                <div className="text-sm text-primary-foreground/90 font-medium">Uppfyllelsegrad</div>
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
              selectedParties={selectedParties}
              selectedStatuses={selectedStatuses}
              selectedGovStatus={selectedGovStatus}
              searchQuery={searchQuery}
              sortBy={sortBy}
              governmentPeriods={governmentPeriods}
              selectedPeriodId={selectedPeriodId}
              onPartiesChange={setSelectedParties}
              onStatusesChange={setSelectedStatuses}
              onGovStatusChange={setSelectedGovStatus}
              onSearchChange={setSearchQuery}
              onSortChange={setSortBy}
              onPeriodChange={setSelectedPeriodId}
            />
            </div>
          </aside>

          {/* Promises List */}
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {sortedPromises.length} {sortedPromises.length === 1 ? "löfte" : "löften"}
              </h2>
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
                    <div key={promise.id} ref={(el) => promiseRefs.current[promise.id] = el}>
                      <PromiseCard
                        promiseId={promise.id}
                        promise={promise.promise_text}
                        party={promise.parties.name}
                        electionYear={promise.election_year}
                        governmentStatus={getGovernmentStatus(promise.parties.name, promise.election_year)}
                        createdAt={new Date(promise.created_at).toLocaleDateString('sv-SE')}
                        updatedAt={new Date(promise.updated_at).toLocaleDateString('sv-SE')}
                        status={promise.status}
                        description={promise.summary || undefined}
                        statusExplanation={promise.status_explanation || undefined}
                        statusSources={promise.status_sources || undefined}
                        directQuote={promise.direct_quote || undefined}
                        pageNumber={promise.page_number || undefined}
                        manifestPdfUrl={promise.manifest_pdf_url || undefined}
                        measurabilityScore={promise.measurability_score || undefined}
                        onStatusUpdate={fetchPromises}
                      />
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <Pagination className="mt-8">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {/* First page */}
                      {currentPage > 2 && (
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(1)} className="cursor-pointer">
                            1
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      
                      {/* Ellipsis before */}
                      {currentPage > 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      
                      {/* Previous page */}
                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(currentPage - 1)} className="cursor-pointer">
                            {currentPage - 1}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      
                      {/* Current page */}
                      <PaginationItem>
                        <PaginationLink isActive className="cursor-pointer">
                          {currentPage}
                        </PaginationLink>
                      </PaginationItem>
                      
                      {/* Next page */}
                      {currentPage < totalPages && (
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(currentPage + 1)} className="cursor-pointer">
                            {currentPage + 1}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      
                      {/* Ellipsis after */}
                      {currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      
                      {/* Last page */}
                      {currentPage < totalPages - 1 && (
                        <PaginationItem>
                          <PaginationLink onClick={() => setCurrentPage(totalPages)} className="cursor-pointer">
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
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
  );
};

export default Index;
