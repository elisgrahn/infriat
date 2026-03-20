import { memo } from "react";
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
import { usePromiseAdminActions } from "@/hooks/usePromiseAdminActions";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PartyBadge } from "@/components/badges/PartyBadge";
import { GovernmentBadge } from "@/components/badges/GovernmentBadge";
import { MeasurabilityBadge } from "@/components/badges/MeasurabilityBadge";
import { CategoryBadge } from "@/components/badges/CategoryBadge";
import { StatusQuoBadge } from "@/components/badges/StatusQuoBadge";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/badgeConfig";
import type { Category } from "@/config/badgeConfig";
import { ShareButton } from "./ShareButton";
import { cn } from "@/lib/utils";

interface PromiseCardProps {
  promiseId: string;
  promise: string;
  party: string;
  partyAbbreviation?: string;
  /** When true all badges use compact labels (abbreviations, icon-only) */
  compactBadges?: boolean;
  electionYear: number;
  governmentStatus: "governing" | "support" | "opposition";
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
  isAdmin?: boolean;
  onStatusUpdate?: () => void;
}

export const PromiseCard = memo(function PromiseCard({
  promiseId,
  promise,
  party,
  partyAbbreviation,
  compactBadges = false,
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
  isAdmin = false,
  onStatusUpdate,
}: PromiseCardProps) {
  const config = STATUS_CONFIG[status];
  const navigate = useNavigate();

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

  return (
    <Card
      className={cn(
        "relative p-6 hover:shadow-lg transition-all duration-300 border-l-4 rounded-2xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 overflow-hidden",
        config.borderColor,
        config.cardHoverClassName,
        config.cardFocusClassName,
      )}
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
      <div className="flex flex-col gap-2 min-w-0">
        {/* title + actions */}
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

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 gap-1.5 text-xs rounded-full"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    <RefreshCw
                      className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-spin")}
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
                      className={cn("w-4 h-4 mr-2", isAnalyzingMeasurability && "animate-spin")}
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
                        className={cn("w-4 h-4 mr-2", isReanalyzingPage && "animate-spin")}
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

        {/* badges — CSS flex-wrap handles row breaking naturally */}
        <div className="min-w-0 flex-1 flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} className="shrink-0" />
            <PartyBadge
              party={party}
              abbreviation={partyAbbreviation}
              compact={compactBadges}
              className="shrink-0"
            />
            <GovernmentBadge
              governmentStatus={governmentStatus}
              compact={false}
              className="shrink-0"
            />
          </div>
          <div className="flex items-center max-w-full gap-2">
            {measurabilityScore && (
              <MeasurabilityBadge
                score={measurabilityScore}
                compact={compactBadges}
                className="shrink-0"
              />
            )}
            {isStatusQuo != null && (
              <StatusQuoBadge
                isStatusQuo={isStatusQuo}
                compact={false}
                className="shrink-0"
              />
            )}
            {category && (
              <CategoryBadge
                category={category}
                compact={false}
                className="min-w-0"
              />
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
});
