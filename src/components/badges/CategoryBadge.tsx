import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG, type Category } from "@/config/categoryConfig";

interface CategoryBadgeProps {
  category: Category;
  /** When true, render only the icon (no text label) */
  compact?: boolean;
  className?: string;
}

export function CategoryBadge({
  category,
  compact = false,
  className,
}: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG["ovrigt"];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn("gap-1.5 overflow-hidden", config.colorClass, className)}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {!compact && (
              <span className="truncate">{config.label}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
