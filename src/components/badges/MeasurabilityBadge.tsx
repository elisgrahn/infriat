import { Badge } from "@/components/ui/badge";
import { Ruler } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MeasurabilityBadgeProps {
  score: number;
  compact?: boolean;
  className?: string;
}

const TOOLTIPS: Record<number, string> = {
  5: "Extremt mätbart - Specifika siffror + tidsram",
  4: "Mycket mätbart - Konkreta mål eller tidsram",
  3: "Måttligt mätbart - Tydlig verifierbar åtgärd",
  2: "Svagt mätbart - Relativa förändringar",
  1: "Nästan omätbart - Vaga formuleringar",
};

function scoreColor(score: number): string {
  if (score === 5) return "text-emerald-600";
  if (score >= 4) return "text-emerald-500";
  if (score === 3) return "text-amber-500";
  if (score === 2) return "text-orange-500";
  return "text-rose-500";
}

export function MeasurabilityBadge({
  score,
  compact = false,
  className,
}: MeasurabilityBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "relative overflow-hidden gap-1.5",
              scoreColor(score),
              className
            )}
          >
            <div 
              className="absolute inset-0 blur-[4px]">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20"
                  style={{ clipPath: `inset(0 ${100 - (score / 5) * 100}% 0 0)` }}
                />
            </div>
            <Ruler className="w-3 h-3 relative" />
            <span className="relative">
              {compact ? `${score}/5` : `Mätbarhet: ${score}/5`}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">{TOOLTIPS[score]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
