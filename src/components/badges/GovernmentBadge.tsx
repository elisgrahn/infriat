import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Handshake, ThumbsDown, ThumbsUp } from "lucide-react";

interface GovernmentBadgeProps {
  governmentStatus: "governing" | "opposition" | "support";
  compact?: boolean;
  className?: string;
}

const CONFIG = {
  governing: {
    label: "Regering",
    compactLabel: "Reg.",
    icon: ThumbsUp,
    tooltip: "Partiet blev regeringsparti efter valet då detta löfte gavs.",
    className: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
  },
  opposition: {
    label: "Opposition",
    compactLabel: "Opp.",
    tooltip: "Partiet blev oppositionsparti efter valet när detta löfte gavs.",
    className: "bg-slate-600 text-white border-slate-600 hover:bg-slate-700",
    icon: ThumbsDown,
  },
  support: {
    label: "Stödparti",
    compactLabel: "Stöd.",
    tooltip: "Partiet blev ett stödparti efter valet när detta löfte gavs.",
    className: "bg-blue-400 text-white border-blue-400 hover:bg-blue-500",
    icon: Handshake,
  },
};

export function GovernmentBadge({
  governmentStatus,
  compact = false,
  className,
}: GovernmentBadgeProps) {
  const config = CONFIG[governmentStatus];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              config.className,
              "border-border gap-1.5",
              className,
            )}
          >
            <config.icon className="w-3 h-3" />
            {compact ? config.compactLabel : config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
