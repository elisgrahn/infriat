import { lazy, Suspense, useEffect, useCallback, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { usePromises } from "@/hooks/usePromises";
import { HeroSection } from "@/components/HeroSection";
import { MobileFilterBar } from "@/components/MobileFilterBar";
import { DesktopFilterSidebar } from "@/components/DesktopFilterSidebar";
import { PromiseList } from "@/components/PromiseList";
import { SeoHead } from "@/components/SeoHead";

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

  const selectedPromise = sortedPromises.find(
    (promise) => promise.id === selectedPromiseId,
  );
  const selectedPromiseStatus = selectedPromise?.status;

  const handleOverlayClose = useCallback(() => {
    // Preserve any existing search params (sort, filters, page) when closing
    const params = new URLSearchParams(searchParams);
    params.delete("promise");
    const qs = params.toString();
    navigate(qs ? `/?${qs}` : "/", { replace: true });
  }, [navigate, searchParams]);

  // Build unique per-promise metadata when a promise is selected
  const promiseSeo = (() => {
    if (!selectedPromiseId) return null;
    const text = (selectedPromise?.promise_text ?? "").trim();
    const party = selectedPromise?.parties?.abbreviation ?? "";
    const shortText = text.length > 70 ? `${text.slice(0, 67)}…` : text;
    const baseTitle = shortText
      ? `${shortText}${party ? ` – ${party}` : ""} | Infriat`
      : "Vallöfte | Infriat";
    const title = baseTitle.length > 60 ? `${baseTitle.slice(0, 57)}…` : baseTitle;
    const descBase = text
      ? `${party ? `${party}: ` : ""}${text}`
      : "Granskning och uppföljning av ett svenskt vallöfte på Infriat.";
    const description =
      descBase.length > 160 ? `${descBase.slice(0, 157)}…` : descBase.length < 50
        ? `${descBase} Följ status och källor på Infriat.`.slice(0, 160)
        : descBase;
    return { title, description, url: `https://infriat.se/lofte/${selectedPromiseId}` };
  })();

  return (
    <>
      {promiseSeo ? (
        <Helmet>
          <title>{promiseSeo.title}</title>
          <meta name="description" content={promiseSeo.description} />
          <link rel="canonical" href={promiseSeo.url} />
          <meta property="og:title" content={promiseSeo.title} />
          <meta property="og:description" content={promiseSeo.description} />
          <meta property="og:url" content={promiseSeo.url} />
          <meta name="robots" content="index,follow" />
        </Helmet>
      ) : (
        <SeoHead
          title="Infriat – Granskning av svenska vallöften"
          description="Har politikerna infriat sina vallöften? Infriat granskar och följer upp riksdagspartiernas valmanifest med AI och öppna källor."
          path="/"
        />
      )}
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
