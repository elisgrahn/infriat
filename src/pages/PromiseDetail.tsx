import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/badgeConfig";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PartyBadge } from "@/components/badges/PartyBadge";
import { GovernmentBadge } from "@/components/badges/GovernmentBadge";
import { MeasurabilityBadge } from "@/components/badges/MeasurabilityBadge";
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
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Ruler,
  RefreshCw,
  Search,
  Trash2,
  Share2,
  Check,
} from "lucide-react";
import { usePromiseAdminActions } from "@/hooks/usePromiseAdminActions";
import { toast } from "sonner";
import { getMandateType } from "@/lib/utils";
import type { GovernmentPeriod } from "@/types/promise";
import { fetchGovernmentPeriods, promiseKeys } from "@/services/promises";

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
  status_tldr: string | null;
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

export default function PromiseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);

  // Fetch single promise via useQuery
  const {
    data: promise,
    isLoading: promiseLoading,
    isError: notFound,
  } = useQuery({
    queryKey: promiseKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promises")
        .select("*, parties(*)")
        .eq("id", id!)
        .single();
      if (error || !data) throw new Error("Not found");
      return data as unknown as PromiseDetailData;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  // Government periods — shared cache with usePromises
  const { data: governmentPeriods = [] } = useQuery({
    queryKey: promiseKeys.governmentPeriods,
    queryFn: fetchGovernmentPeriods,
    staleTime: 5 * 60 * 1000,
  });

  // Citation sources
  const { data: citationSources = [] } = useQuery({
    queryKey: ["promise-sources", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promise_sources")
        .select("url, title")
        .eq("promise_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { url: string; title: string | null }[];
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  const loading = promiseLoading;

  const refetchPromise = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: promiseKeys.detail(id!) });
  }, [queryClient, id]);

  const handleShare = async () => {
    const url = `${window.location.origin}/lofte/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunde inte kopiera länk");
    }
  };

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
    promiseId: id!,
    status: promise?.status ?? "pending-analysis",
    directQuote: promise?.direct_quote ?? undefined,
    manifestPdfUrl: promise?.manifest_pdf_url ?? undefined,
    measurabilityScore: promise?.measurability_score ?? undefined,
    onStatusUpdate: refetchPromise,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground animate-pulse">Laddar löfte…</div>
      </div>
    );
  }

  if (notFound || !promise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">Löftet hittades inte.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Tillbaka
        </Button>
      </div>
    );
  }

  const config = STATUS_CONFIG[promise.status];
  const govStatus = getMandateType(
    promise.parties.name,
    promise.election_year,
    governmentPeriods,
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Tillbaka
      </Button>

      {/* Hero band */}
      <div className={cn("rounded-xl border-l-4 bg-card p-6 shadow-sm space-y-4", config.borderColor)}>
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={promise.status} />
          <PartyBadge party={promise.parties.name} />
          <GovernmentBadge governmentStatus={govStatus} />
          {promise.measurability_score !== null && (
            <MeasurabilityBadge score={promise.measurability_score} />
          )}
        </div>

        {/* Promise text */}
        <h1 className="text-xl font-semibold leading-snug text-foreground">
          {promise.promise_text}
        </h1>

        {/* Summary */}
        {promise.summary && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {promise.summary}
          </p>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Valår: {promise.election_year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Uppdaterad:{" "}
              {new Date(promise.updated_at).toLocaleDateString("sv-SE")}
            </span>
          </div>
        </div>
      </div>

      {/* Status explanation */}
      {(promise.status_tldr || promise.status_explanation) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Statusbedömning
          </h2>
          {promise.status_tldr && (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {promise.status_tldr}
              </p>
            </div>
          )}
          {promise.status_explanation && (
            <p className="text-sm leading-relaxed text-foreground">
              <CitedText
                text={promise.status_explanation}
                sources={citationSources}
              />
            </p>
          )}
        </section>
      )}

      {/* Original quote */}
      {promise.direct_quote && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
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

      {/* Measurability reasoning */}
      {promise.measurability_reason && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Ruler className="w-4 h-4" />
              Mätbart
            </h2>
            <p className="text-sm leading-relaxed text-foreground">
              {promise.measurability_reason}
            </p>
          </section>
        </>
      )}

      {/* Sources */}
      <Separator />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Källor
        </h2>
        <SourcesList promiseId={promise.id} isAdmin={isAdmin} />
      </section>

      {/* Community notes */}
      <Separator />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Medborgarförslag
        </h2>
        <CommunityNotes promiseId={promise.id} />
      </section>

      {/* Admin actions */}
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
                        navigate("/");
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
