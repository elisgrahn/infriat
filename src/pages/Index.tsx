import { lazy, Suspense, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePromises } from "@/hooks/usePromises";
import { HeroSection } from "@/components/HeroSection";
import { MobileFilterBar } from "@/components/MobileFilterBar";
import { DesktopFilterSidebar } from "@/components/DesktopFilterSidebar";
import { PromiseList } from "@/components/PromiseList";

// Lazy-load below-the-fold components
const TimelineComparison = lazy(() => import("@/components/TimelineComparison").then(m => ({ default: m.TimelineComparison })));
const PromiseDetailOverlay = lazy(() => import("@/components/PromiseDetailOverlay").then(m => ({ default: m.PromiseDetailOverlay })));

const Index = () => {
  const navigate = useNavigate();
  const { id: legacyPromiseId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPromiseId = searchParams.get("promise") ?? undefined;

  const {
    loading,
    filteredPromises,
    sortedPromises,
    stats,
    filterKey,
    governmentPeriods,
    getGovernmentStatus,
    refetchPromises,
  } = usePromises();

  const selectedPromiseStatus = sortedPromises.find(
    (promise) => promise.id === selectedPromiseId,
  )?.status;

  const handleOverlayClose = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("promise");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  return (
    <>
      <div className="bg-background">
        <HeroSection stats={stats} />

        <main className="container mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Party Comparison - Full Width Above Filters */}
            <div className="lg:col-span-4">
              <TimelineComparison
                promises={filteredPromises}
                governmentPeriods={governmentPeriods}
              />
            </div>

            <DesktopFilterSidebar filteredCount={filteredPromises.length} />

            <div className="lg:col-span-3">
              <MobileFilterBar filteredCount={filteredPromises.length} />

              <PromiseList
                promises={sortedPromises}
                loading={loading}
                getGovernmentStatus={getGovernmentStatus}
                onStatusUpdate={refetchPromises}
                filterKey={filterKey}
              />
            </div>
          </div>
        </main>
      </div>

      <PromiseDetailOverlay
        promiseId={selectedPromiseId}
        initialStatus={selectedPromiseStatus}
        onClose={handleOverlayClose}
      />
    </>
  );
};

export default Index;
