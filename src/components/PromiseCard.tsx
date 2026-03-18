import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  RefreshCw,
  Clock,
  Upload,
  Trash2,
  Search,
  Ruler,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { usePromiseAdminActions } from "@/hooks/usePromiseAdminActions";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PartyBadge } from "@/components/badges/PartyBadge";
import { GovernmentBadge } from "@/components/badges/GovernmentBadge";
import { MeasurabilityBadge } from "@/components/badges/MeasurabilityBadge";
import { CategoryBadge } from "@/components/badges/CategoryBadge";
import { StatusQuoBadge } from "@/components/badges/StatusQuoBadge";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";
import type { Category } from "@/config/categoryConfig";
import { ShareButton } from "./ShareButton";


interface PromiseCardProps {
  promiseId: string;
  promise: string;
  party: string;
  partyAbbreviation?: string;
  sharedCompactBadges?: boolean;
  onCompactNeedChange?: (promiseId: string, needsCompact: boolean) => void;
  electionYear: number;
  governmentStatus: 'governing' | 'support' | 'opposition';
  createdAt: string;
  updatedAt: string;
  status: PromiseStatus;
  description?: string;
  statusExplanation?: string;
  statusSources?: string[];
  directQuote?: string;
  pageNumber?: number;
  manifestPdfUrl?: string;
  measurabilityScore?: number;
  category?: Category | null;
  isStatusQuo?: boolean | null;
  onStatusUpdate?: () => void;
}

export const PromiseCard = ({
  promiseId,
  promise,
  party,
  partyAbbreviation,
  sharedCompactBadges = false,
  onCompactNeedChange,
  electionYear,
  governmentStatus,
  createdAt,
  updatedAt,
  status,
  description,
  statusExplanation,
  statusSources,
  directQuote,
  pageNumber,
  manifestPdfUrl,
  measurabilityScore,
  category,
  isStatusQuo,
  onStatusUpdate,
}: PromiseCardProps) => {
  const config = STATUS_CONFIG[status];
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const badgesContainerRef = useRef<HTMLDivElement>(null);
  const fullBadgesMeasureRef = useRef<HTMLDivElement>(null);
  const [needsCompactBadges, setNeedsCompactBadges] = useState(false);

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
    status,
    directQuote,
    manifestPdfUrl,
    measurabilityScore,
    onStatusUpdate,
  });

  useEffect(() => {
    const measureBadgeFit = () => {
      if (!badgesContainerRef.current || !fullBadgesMeasureRef.current) return;

      const availableWidth = badgesContainerRef.current.clientWidth;
      const fullWidth = fullBadgesMeasureRef.current.scrollWidth;
      setNeedsCompactBadges(fullWidth > availableWidth + 1);
    };

    measureBadgeFit();

    const resizeObserver = new ResizeObserver(measureBadgeFit);
    if (badgesContainerRef.current) resizeObserver.observe(badgesContainerRef.current);
    if (fullBadgesMeasureRef.current) resizeObserver.observe(fullBadgesMeasureRef.current);

    window.addEventListener("resize", measureBadgeFit);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureBadgeFit);
    };
  }, [status, party, governmentStatus, measurabilityScore]);

  useEffect(() => {
    if (!onCompactNeedChange) return;
    onCompactNeedChange(promiseId, needsCompactBadges);

    return () => {
      onCompactNeedChange(promiseId, false);
    };
  }, [onCompactNeedChange, promiseId, needsCompactBadges]);

  const compactBadges = sharedCompactBadges || needsCompactBadges;

  return (
    <Card
      className={`relative p-6 hover:shadow-lg transition-all duration-300 border-l-4 rounded-2xl ${config.borderColor} ${config.cardHoverClassName} ${config.cardFocusClassName} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/?promise=${promiseId}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate(`/?promise=${promiseId}`);
        }
      }}
    >
      <div className="flex flex-col gap-2">
        
        {/* title + actions*/}
        <div className="flex items-start justify-between gap-2">

        <h3 className="text-lg font-semibold text-foreground leading-snug">
          {promise}
        </h3>

                  <div
            className="flex gap-2 shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <ShareButton promiseId={promiseId} />

            {isAdmin && !loading && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isAnalyzing ? "animate-spin" : ""}`}
                    />
                    {isAnalyzing
                      ? "Analyserar..."
                      : status === "pending-analysis"
                        ? "Analysera status"
                        : "Analysera om status"}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleAnalyzeMeasurability}
                    disabled={isAnalyzingMeasurability}
                  >
                    <Ruler
                      className={`w-4 h-4 mr-2 ${isAnalyzingMeasurability ? "animate-spin" : ""}`}
                    />
                    {isAnalyzingMeasurability
                      ? "Analyserar..."
                      : measurabilityScore
                        ? "Analysera om mätbarhet"
                        : "Analysera mätbarhet"}
                  </DropdownMenuItem>

                  {directQuote && manifestPdfUrl && (
                    <DropdownMenuItem
                      onClick={handleReanalyzePage}
                      disabled={isReanalyzingPage}
                    >
                      <Search
                        className={`w-4 h-4 mr-2 ${isReanalyzingPage ? "animate-spin" : ""}`}
                      />
                      {isReanalyzingPage ? "Söker..." : "Hitta sidnummer"}
                    </DropdownMenuItem>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Radera
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Är du säker?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Detta kommer permanent radera vallöftet. Denna åtgärd
                          kan inte ångras.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? "Raderar..." : "Radera"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* badges */}
          <div ref={badgesContainerRef} className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0 flex-nowrap">
              <StatusBadge status={status} className="shrink-0" />
              <PartyBadge
                party={party}
                abbreviation={partyAbbreviation}
                compact={compactBadges}
                className="shrink-0"
              />
              <GovernmentBadge
                governmentStatus={governmentStatus}
                compact={compactBadges}
                className="shrink-0"
              />
              {measurabilityScore && (
                <MeasurabilityBadge
                  score={measurabilityScore}
                  compact={compactBadges}
                  className="shrink-0"
                />
              )}
              {category && (
                <CategoryBadge
                  category={category}
                  compact={compactBadges}
                  className="shrink-0"
                />
              )}
              {isStatusQuo != null && (
                <StatusQuoBadge
                  isStatusQuo={isStatusQuo}
                  compact={compactBadges}
                  className="shrink-0"
                />
              )}
            </div>
          </div>

          <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 -z-10"
          >
            <div ref={fullBadgesMeasureRef} className="absolute left-0 top-0 flex w-max items-center gap-2 whitespace-nowrap">
              <StatusBadge status={status} className="shrink-0" />
              <PartyBadge
                party={party}
                abbreviation={partyAbbreviation}
                className="shrink-0"
              />
              <GovernmentBadge governmentStatus={governmentStatus} className="shrink-0" />
              {measurabilityScore && (
                <MeasurabilityBadge score={measurabilityScore} className="shrink-0" />
              )}
              {category && (
                <CategoryBadge category={category} className="shrink-0" />
              )}
              {isStatusQuo != null && (
                <StatusQuoBadge isStatusQuo={isStatusQuo} className="shrink-0" />
              )}
            </div>
          </div>

        {/* description */}
        {description && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        )}

        {/* Footer metadata */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Valår: {electionYear}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Tillagt: {createdAt}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Uppdaterat: {updatedAt}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
