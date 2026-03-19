import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { STATUS_QUO_CONFIG } from "@/config/categoryConfig";

interface StatusQuoBadgeProps {
  isStatusQuo: boolean;
  /** When true, render only the icon (no text label) */
  compact?: boolean;
  className?: string;
}

export function StatusQuoBadge({
  isStatusQuo,
  compact = false,
  className,
}: StatusQuoBadgeProps) {
  const key = String(isStatusQuo) as "true" | "false";
  const config = STATUS_QUO_CONFIG[key] ?? STATUS_QUO_CONFIG["false"];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn("gap-1.5", config.colorClass, className)}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {!compact && <span>{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-[200px]">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
