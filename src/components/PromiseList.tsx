import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { PromiseCard } from "@/components/PromiseCard";
import { PromiseCardSkeleton } from "@/components/PromiseCardSkeleton";
import { PromisePagination } from "@/components/PromisePagination";
import { useAuth } from "@/hooks/useAuth";
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
  const [cardCompactNeeds, setCardCompactNeeds] = useState<
    Record<string, boolean>
  >({});

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKey]);

  const totalPages = Math.ceil(promises.length / ITEMS_PER_PAGE);
  const paginatedPromises = promises.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleCardCompactNeedChange = useCallback(
    (promiseId: string, needsCompact: boolean) => {
      setCardCompactNeeds((previous) => {
        if (previous[promiseId] === needsCompact) return previous;
        return { ...previous, [promiseId]: needsCompact };
      });
    },
    [],
  );

  const sharedCompactBadges = Object.values(cardCompactNeeds).some(Boolean);

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
      <div className="grid gap-4">
        {paginatedPromises.map((promise) => (
          <div key={promise.id}>
            <PromiseCard
              promiseId={promise.id}
              promise={promise.promise_text}
              party={promise.parties.name}
              partyAbbreviation={promise.parties.abbreviation}
              sharedCompactBadges={sharedCompactBadges}
              onCompactNeedChange={handleCardCompactNeedChange}
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
