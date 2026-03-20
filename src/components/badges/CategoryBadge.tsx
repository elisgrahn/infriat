import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORY_CONFIG, type Category, CATEGORY_VARIANTS } from "@/config/badgeConfig";
import { InteractiveBadge } from "./InteractiveBadge";

interface CategoryBadgeProps {
  category: Category;
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
    <InteractiveBadge
      currentKey={category}
      variants={CATEGORY_VARIANTS}
      sectionAnchor="politikomrade"
      popoverTitle="Politikområde"
    >
      <Badge
        variant="outline"
        className={cn("gap-1.5 min-w-0 overflow-hidden", config.badgeClass, className)}
      >
        <Icon className="w-3 h-3 shrink-0" />
        {!compact && <span className="truncate">{config.label}</span>}
      </Badge>
    </InteractiveBadge>
  );
}
