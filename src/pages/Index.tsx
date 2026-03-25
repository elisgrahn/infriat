import { lazy, Suspense, useEffect, useCallback, useState, useRef } from "react";
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
  const { id: promiseIdFromPath } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  // Support both /lofte/:id (primary) and legacy ?promise= query param
  const selectedPromiseId = promiseIdFromPath ?? searchParams.get("promise") ?? undefined;

  // Defer chart rendering until its container enters viewport
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartVisible, setChartVisible] = useState(false);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setChartVisible(true); io.disconnect(); } },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    // Preserve any existing search params (sort, filters, page) when closing
    const params = new URLSearchParams(searchParams);
    params.delete("promise");
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : "/", { replace: true });
  }, [navigate, searchParams]);

  return (
    <>
      <div className="bg-background">
        <HeroSection stats={stats} />

        <main className="container mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Party Comparison - Full Width Above Filters */}
            <div className="lg:col-span-4 min-h-[420px]" ref={chartRef}>
              {chartVisible && (
                <Suspense fallback={<div className="h-[420px]" />}>
                  <TimelineComparison
                    promises={filteredPromises}
                    governmentPeriods={governmentPeriods}
                  />
                </Suspense>
              )}
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

      <Suspense fallback={null}>
        <PromiseDetailOverlay
          promiseId={selectedPromiseId}
          initialStatus={selectedPromiseStatus}
          onClose={handleOverlayClose}
        />
      </Suspense>
    </>
  );
};

export default Index;
