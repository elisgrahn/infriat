import { useState } from "react";
import { PromiseCard } from "@/components/PromiseCard";
import { PromiseFilters } from "@/components/PromiseFilters";
import { mockPromises } from "@/data/mockPromises";
import { ShieldCheck, Scale, TrendingUp } from "lucide-react";

const Index = () => {
  const [selectedParty, setSelectedParty] = useState("Alla");
  const [selectedStatus, setSelectedStatus] = useState("Alla");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPromises = mockPromises.filter((promise) => {
    const matchesParty = selectedParty === "Alla" || promise.party === selectedParty;
    const matchesStatus =
      selectedStatus === "Alla" ||
      (selectedStatus === "Uppfyllt" && promise.status === "kept") ||
      (selectedStatus === "Brutet" && promise.status === "broken") ||
      (selectedStatus === "Pågående" && promise.status === "in-progress");
    const matchesSearch =
      searchQuery === "" ||
      promise.promise.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promise.party.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesParty && matchesStatus && matchesSearch;
  });

  const stats = {
    total: mockPromises.length,
    kept: mockPromises.filter((p) => p.status === "kept").length,
    broken: mockPromises.filter((p) => p.status === "broken").length,
    inProgress: mockPromises.filter((p) => p.status === "in-progress").length,
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
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Politiska Löften
            </h1>
            
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

            {filteredPromises.length === 0 ? (
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
                    promise={promise.promise}
                    party={promise.party}
                    date={promise.date}
                    status={promise.status}
                    description={promise.description}
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
