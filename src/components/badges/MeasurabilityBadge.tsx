import { Badge } from "@/components/ui/badge";
import { Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { MEASURABILITY_VARIANTS } from "@/config/badgeConfig";
import { InteractiveBadge } from "./InteractiveBadge";

interface MeasurabilityBadgeProps {
  score: number;
  compact?: boolean;
  className?: string;
}

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
    <InteractiveBadge
      currentKey={String(score)}
      variants={MEASURABILITY_VARIANTS}
      sectionAnchor="matbarhet"
      popoverTitle="Mätbarhet"
    >
      <Badge
        variant="outline"
        className={cn(
          "relative overflow-hidden gap-1.5",
          scoreColor(score),
          className,
        )}
      >
        <div className="absolute inset-0 blur-[4px]">
          <div
            className="absolute inset-0 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-emerald-500/20"
            style={{ clipPath: `inset(0 ${100 - (score / 5) * 100}% 0 0)` }}
          />
        </div>
        <Ruler className="w-3 h-3 relative" />
        <span className="relative">
          {compact ? `${score}/5` : `Mätbart: ${score}/5`}
        </span>
      </Badge>
    </InteractiveBadge>
  );
}
