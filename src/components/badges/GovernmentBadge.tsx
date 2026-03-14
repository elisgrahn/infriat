import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GovernmentBadgeProps {
  governmentStatus: "governing" | "opposition";
  className?: string;
}

const CONFIG = {
  governing: {
    label: "Regering",
    tooltip: "Partiet satt i regeringen när detta löfte gavs",
    className: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
  },
  opposition: {
    label: "Opposition",
    tooltip:
      "Partiet var i opposition när detta löfte gavs. Oppositionspartier har begränsade möjligheter att genomföra sin politik.",
    className: "bg-slate-600 text-white border-slate-600 hover:bg-slate-700",
  },
};

export function GovernmentBadge({ governmentStatus, className }: GovernmentBadgeProps) {
  const config = CONFIG[governmentStatus];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn(config.className, className)}>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
