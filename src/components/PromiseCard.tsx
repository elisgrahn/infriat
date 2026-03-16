import { useState } from "react";
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
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";
import { ShareButton } from "./ShareButton";


interface PromiseCardProps {
  promiseId: string;
  promise: string;
  party: string;
  electionYear: number;
  governmentStatus: 'governing' | 'opposition';
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
  onStatusUpdate?: () => void;
}

export const PromiseCard = ({
  promiseId,
  promise,
  party,
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
  onStatusUpdate,
}: PromiseCardProps) => {
  const config = STATUS_CONFIG[status];
  const { isAdmin, loading } = useAuth();
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
      className={`p-6 hover:shadow-lg transition-all duration-300 border-l-4 ${config.borderColor} ${config.cardHoverClassName} ${config.cardFocusClassName} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
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
      <div className="flex flex-col gap-4">
        {/* Header row: badges + action buttons */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <PartyBadge party={party} />
            <GovernmentBadge governmentStatus={governmentStatus} />
            {measurabilityScore && (
              <MeasurabilityBadge score={measurabilityScore} />
            )}
          </div>

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

        {/* Promise title + description */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground leading-snug">
            {promise}
          </h3>
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Tabs: Statusbedömning | Citat | Källor | Medborgarförslag */}
        {/* <Tabs defaultValue="explanation" className="w-full">
          <TabsList className="w-full h-auto flex-wrap justify-start bg-muted/50">
            <TabsTrigger value="explanation" className="text-xs">
              Statusbedömning
            </TabsTrigger>
            {directQuote && (
              <TabsTrigger value="quote" className="text-xs">
                <FileText className="w-3 h-3 mr-1.5" />
                Citat
              </TabsTrigger>
            )}
            <TabsTrigger value="sources" className="text-xs">
              Källor
            </TabsTrigger>
            <TabsTrigger value="community" className="text-xs">
              Medborgarförslag
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explanation" className="mt-3">
            {statusExplanation && status !== "pending-analysis" ? (
              <p className="text-sm text-foreground leading-relaxed">
                {statusExplanation}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {status === "pending-analysis"
                  ? "Statusbedömning pågår..."
                  : "Ingen statusbedömning tillgänglig ännu."}
              </p>
            )}
          </TabsContent>

          {directQuote && (
            <TabsContent value="quote" className="mt-3">
              <div className="bg-muted/50 border-l-2 border-primary pl-4 py-2 rounded-r space-y-3">
                <p className="text-sm italic text-foreground">
                  "{directQuote}"
                </p>
                {manifestPdfUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={
                        pageNumber
                          ? `${manifestPdfUrl}#page=${pageNumber}`
                          : manifestPdfUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {pageNumber
                        ? `Öppna i källa (sida ${pageNumber})`
                        : "Öppna manifest"}
                    </a>
                  </Button>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="sources" className="mt-3">
            <SourcesList promiseId={promiseId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="community" className="mt-3">
            <CommunityNotes promiseId={promiseId} />
          </TabsContent>
        </Tabs> */}

        {/* Footer metadata */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
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
