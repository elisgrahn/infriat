import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";
import { STATUS_VARIANTS } from "@/config/badgeDescriptions";
import { InteractiveBadge } from "./InteractiveBadge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: PromiseStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <InteractiveBadge
      currentKey={status}
      variants={STATUS_VARIANTS}
      sectionAnchor="status"
      popoverTitle="Statusar"
    >
      <Badge variant="outline" className={cn(config.badgeClassName, "gap-1.5", className)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    </InteractiveBadge>
  );
}
