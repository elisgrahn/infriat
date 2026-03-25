import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { PromiseCard } from "@/components/PromiseCard";
import { PromiseCardSkeleton } from "@/components/PromiseCardSkeleton";
import { PromisePagination } from "@/components/PromisePagination";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PartyBadge } from "@/components/badges/PartyBadge";
import { GovernmentBadge } from "@/components/badges/GovernmentBadge";
import { MeasurabilityBadge } from "@/components/badges/MeasurabilityBadge";
import { StatusQuoBadge } from "@/components/badges/StatusQuoBadge";
import { CategoryBadge } from "@/components/badges/CategoryBadge";
import type { PromiseData, GovernmentStatus } from "@/types/promise";

interface PromiseListProps {
  promises: PromiseData[];
  loading: boolean;
  getGovernmentStatus: (partyName: string, electionYear: number) => GovernmentStatus;
  onStatusUpdate: () => void;
  /** Any time this value changes, pagination resets to page 1 */
  filterKey: string;
}

const ITEMS_PER_PAGE = 20;

export function PromiseList({
  promises,
  loading,
  getGovernmentStatus,
  onStatusUpdate,
  filterKey,
}: PromiseListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const { isAdmin } = useAuth();

  // -- List-level badge compact measurement --
  // A single hidden measurement row with the longest party name from the
  // current page. If it overflows the container, all cards switch to compact.
  const [compactBadges, setCompactBadges] = useState(false);
  const measureContainerRef = useRef<HTMLDivElement>(null);
  const measureRowRef = useRef<HTMLDivElement>(null);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKey]);

  const totalPages = Math.ceil(promises.length / ITEMS_PER_PAGE);
  const paginatedPromises = promises.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Find the longest party name on the current page for measurement
  const longestParty = useMemo(() => {
    if (paginatedPromises.length === 0) return { name: "", abbreviation: "" };
    return paginatedPromises.reduce(
      (longest, p) =>
        p.parties.name.length > longest.name.length
          ? { name: p.parties.name, abbreviation: p.parties.abbreviation }
          : longest,
      { name: "", abbreviation: "" },
    );
  }, [paginatedPromises]);

  // Single ResizeObserver for the entire list — measures whether the
  // "worst case" badge row fits the card width
  useEffect(() => {
    const measure = () => {
      if (!measureContainerRef.current || !measureRowRef.current) return;
      const available = measureContainerRef.current.clientWidth;
      const needed = measureRowRef.current.scrollWidth;
      setCompactBadges(needed > available + 1);
    };

    measure();

    const ro = new ResizeObserver(measure);
    if (measureContainerRef.current) ro.observe(measureContainerRef.current);

    return () => ro.disconnect();
  }, [longestParty.name]);

  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <PromiseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (promises.length === 0) {
    return (
      <Card className="text-center py-16">
        <p className="text-muted-foreground text-lg">
          Inga löften hittades som matchar dina filter.
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Hidden measurement container — single instance for the entire list */}
      <div
        ref={measureContainerRef}
        aria-hidden="true"
        {...{ inert: "" } as any}
        className="relative overflow-hidden pointer-events-none h-0"
      >
        <div
          ref={measureRowRef}
          className="absolute left-0 top-0 flex w-max items-center gap-2 whitespace-nowrap"
        >
          <StatusBadge status="infriat" />
          <PartyBadge party={longestParty.name} abbreviation={longestParty.abbreviation} compact={false} />
          <GovernmentBadge governmentStatus="governing" compact={false} />
          <MeasurabilityBadge score={5} compact={false} />
          <StatusQuoBadge isStatusQuo={true} compact={false} />
          <CategoryBadge category="arbetsmarknad" compact={false} />
        </div>
      </div>

      <div className="grid gap-4">
        {paginatedPromises.map((promise) => (
          <div key={promise.id} className="min-w-0">
            <PromiseCard
              promiseId={promise.id}
              promise={promise.promise_text}
              party={promise.parties.name}
              partyAbbreviation={promise.parties.abbreviation}
              compactBadges={compactBadges}
              electionYear={promise.election_year}
              governmentStatus={getGovernmentStatus(
                promise.parties.name,
                promise.election_year,
              )}
              createdAt={new Date(promise.created_at).toLocaleDateString(
                "sv-SE",
              )}
              updatedAt={new Date(promise.updated_at).toLocaleDateString(
                "sv-SE",
              )}
              status={promise.status}
              description={promise.summary || undefined}
              directQuote={promise.direct_quote || undefined}
              pageNumber={promise.page_number || undefined}
              manifestPdfUrl={promise.manifest_pdf_url || undefined}
              measurabilityScore={promise.measurability_score || undefined}
              category={promise.category}
              isStatusQuo={promise.is_status_quo}
              isAdmin={isAdmin}
              onStatusUpdate={onStatusUpdate}
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
  );
}
