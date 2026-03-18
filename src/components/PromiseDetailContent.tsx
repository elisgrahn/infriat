import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { type PromiseStatus } from "@/config/statusConfig";
import { SourcesList } from "@/components/SourcesList";
import { CommunityNotes } from "@/components/CommunityNotes";
import { CitedText } from "@/components/CitedText";
import { CitationFootnotes } from "@/components/CitationFootnotes";
import { PromiseDetailSkeleton } from "@/components/PromiseDetailSkeleton";
import { PromiseInsightRadar } from "@/components/PromiseInsightRadar";
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
  Link,
} from "lucide-react";
import { usePromiseAdminActions } from "@/hooks/usePromiseAdminActions";
import { toast } from "sonner";
...
  return (
    <div className="space-y-4">
      <PromiseInsightRadar
        promise={promise}
        citationCount={citationSources.length}
      />

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

      {citationSources.length > 0 && (
        <>
          <Separator />
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Link className="w-4 h-4" />
              Källor
            </h2>
            <CitationFootnotes sources={citationSources} className="border-border/50" />
          </section>
        </>
      )}

      {/* <Separator />
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Källor
        </h2>
        <SourcesList promiseId={promise.id} isAdmin={isAdmin} />
      </section> */}

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
