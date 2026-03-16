import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type PromiseStatus } from "@/config/statusConfig";
import { SourcesList } from "@/components/SourcesList";
import { CommunityNotes } from "@/components/CommunityNotes";
import { CitedText } from "@/components/CitedText";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ExternalLink,
  Quote,
  RefreshCw,
  Ruler,
  Search,
  Trash2,
  CircleHelp,
} from "lucide-react";
import { usePromiseAdminActions } from "@/hooks/usePromiseAdminActions";
import { toast } from "sonner";

interface PromiseDetailData {
  id: string;
  promise_text: string;
  summary: string | null;
  direct_quote: string | null;
  measurability_reason: string | null;
  measurability_score: number | null;
  status: PromiseStatus;
  status_explanation: string | null;
  status_sources: string[] | null;
  page_number: number | null;
  manifest_pdf_url: string | null;
  election_year: number;
  created_at: string;
  updated_at: string;
  parties: {
    name: string;
    abbreviation: string;
  };
}

interface GovernmentPeriod {
  id: string;
  start_year: number;
  end_year: number | null;
  governing_parties: string[];
  support_parties: string[] | null;
}

interface PromiseDetailContentProps {
  promiseId: string;
  onClose: () => void;
  onStatusChange?: (status: PromiseStatus) => void;
  onHeaderDataChange?: (data: PromiseDetailHeaderData | null) => void;
}

export interface PromiseDetailHeaderData {
  title: string;
  status: PromiseStatus;
  partyName: string;
  governmentStatus: "governing" | "opposition";
  measurabilityScore: number | null;
}

function getGovernmentStatus(
  partyName: string,
  electionYear: number,
  periods: GovernmentPeriod[],
): "governing" | "opposition" {
  const period = periods.find(
    (p) =>
      p.start_year <= electionYear &&
      (p.end_year === null || p.end_year >= electionYear),
  );
  if (!period) return "opposition";
  const allGoverning = [
    ...(period.governing_parties || []),
    ...(period.support_parties || []),
  ];
  return allGoverning.includes(partyName) ? "governing" : "opposition";
}

export function PromiseDetailContent({
  promiseId,
  onClose,
  onStatusChange,
  onHeaderDataChange,
}: PromiseDetailContentProps) {
  const { isAdmin } = useAuth();

  const [promise, setPromise] = useState<PromiseDetailData | null>(null);
  const [governmentPeriods, setGovernmentPeriods] = useState<GovernmentPeriod[]>(
    [],
  );
  const [citationSources, setCitationSources] = useState<{ url: string; title: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchPromise = async () => {
    setLoading(true);
    setNotFound(false);

    try {
      const { data, error } = await supabase
        .from("promises")
        .select("*, parties(*)")
        .eq("id", promiseId)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        const nextPromise = data as unknown as PromiseDetailData;
        setPromise(nextPromise);
        onStatusChange?.(nextPromise.status);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchCitationSources = async () => {
    try {
      const { data, error } = await supabase
        .from("promise_sources")
        .select("url, title")
        .eq("promise_id", promiseId)
        .order("created_at", { ascending: true });
      if (!error && data) setCitationSources(data);
    } catch {
      // Silently ignore
    }
  };

  const fetchGovernmentPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from("government_periods")
        .select("*")
        .order("start_year", { ascending: true });
      if (!error && data) setGovernmentPeriods(data as GovernmentPeriod[]);
    } catch {
      // Silently ignore
    }
  };

  useEffect(() => {
    if (!promiseId) return;
    fetchPromise();
    fetchCitationSources();
    fetchGovernmentPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promiseId]);

  useEffect(() => {
    if (!onHeaderDataChange) return;
    if (!promise) {
      onHeaderDataChange(null);
      return;
    }

    onHeaderDataChange({
      title: promise.promise_text,
      status: promise.status,
      partyName: promise.parties.name,
      governmentStatus: getGovernmentStatus(
        promise.parties.name,
        promise.election_year,
        governmentPeriods,
      ),
      measurabilityScore: promise.measurability_score,
    });
  }, [governmentPeriods, onHeaderDataChange, promise]);

  const {
    isAnalyzing,
    isAnalyzingMeasurability,
    isReanalyzingPage,
    isDeleting,
    handleAnalyze,
    handleAnalyzeMeasurability,
    handleReanalyzePage,
    handleDelete,
  } = usePromiseAdminActions({
    promiseId,
    status: promise?.status ?? "pending-analysis",
    directQuote: promise?.direct_quote ?? undefined,
    manifestPdfUrl: promise?.manifest_pdf_url ?? undefined,
    measurabilityScore: promise?.measurability_score ?? undefined,
    onStatusUpdate: fetchPromise,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-muted-foreground animate-pulse">Laddar löfte…</div>
      </div>
    );
  }

  if (notFound || !promise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-muted-foreground text-lg">Löftet hittades inte.</p>
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {promise.summary && (
        <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <CircleHelp className="w-4 h-4" />
              Sammanfattning
            </h2>
          <p className="text-sm leading-relaxed text-foreground">
            {promise.summary}
          </p>
        </section>
      )}

      {promise.direct_quote && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Quote className="w-4 h-4" />
              Citat ur valmanifest
            </h2>
            <blockquote className="border-l-2 border-muted pl-4 italic text-sm text-muted-foreground leading-relaxed">
              "{promise.direct_quote}"
            </blockquote>
            {promise.manifest_pdf_url && promise.page_number && (
              <a
                href={`${promise.manifest_pdf_url}#page=${promise.page_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Öppna manifest, sida {promise.page_number}
              </a>
            )}
          </section>
        </>
      )}

      {promise.measurability_reason && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Ruler className="w-4 h-4" />
              Mätbarhet
            </h2>
            <p className="text-sm leading-relaxed text-foreground">
              {promise.measurability_reason}
            </p>
          </section>
        </>
      )}

      {promise.status_explanation && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              Statusbedömning
            </h2>
            <p className="text-sm leading-relaxed text-foreground">
              <CitedText
                text={promise.status_explanation}
                sources={citationSources}
              />
            </p>
          </section>
        </>
      )}

      <Separator />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Källor
        </h2>
        <SourcesList promiseId={promise.id} isAdmin={isAdmin} />
      </section>

      <Separator />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Medborgarförslag
        </h2>
        <CommunityNotes promiseId={promise.id} />
      </section>

      {isAdmin && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Adminåtgärder
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                {isAnalyzing ? "Analyserar…" : "Analysera status"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyzeMeasurability}
                disabled={isAnalyzingMeasurability}
                className="gap-1.5"
              >
                <Ruler className="w-3.5 h-3.5" />
                {isAnalyzingMeasurability ? "Analyserar…" : "Analysera mätbarhet"}
              </Button>
              {promise.manifest_pdf_url && promise.page_number && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReanalyzePage}
                  disabled={isReanalyzingPage}
                  className="gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isReanalyzingPage ? "Analyserar…" : "Omanalysera sida"}
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={isDeleting}
                    className="gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeleting ? "Tar bort…" : "Ta bort löfte"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Ta bort löfte?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Detta går inte att ångra. Löftet och all tillhörande data
                      raderas permanent.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await handleDelete();
                        onClose();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Ta bort
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
