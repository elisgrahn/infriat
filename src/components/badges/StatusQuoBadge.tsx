import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_QUO_CONFIG } from "@/config/categoryConfig";
import { STATUS_QUO_VARIANTS } from "@/config/badgeDescriptions";
import { InteractiveBadge } from "./InteractiveBadge";

interface StatusQuoBadgeProps {
  isStatusQuo: boolean;
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
    <InteractiveBadge
      currentKey={key}
      variants={STATUS_QUO_VARIANTS}
      sectionAnchor="typ"
      popoverTitle="Typ av löfte"
    >
      <Badge
        variant="outline"
        className={cn("gap-1.5", config.colorClass, className)}
      >
        <Icon className="w-3 h-3 shrink-0" />
        {!compact && <span>{config.label}</span>}
      </Badge>
    </InteractiveBadge>
  );
}
