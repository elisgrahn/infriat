import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Handshake, ThumbsDown, ThumbsUp } from "lucide-react";
import { GOVERNMENT_VARIANTS } from "@/config/badgeConfig";
import { InteractiveBadge } from "./InteractiveBadge";

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
    className: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
  },
  opposition: {
    label: "Opposition",
    compactLabel: "Opp.",
    className: "bg-slate-600 text-white border-slate-600 hover:bg-slate-700",
    icon: ThumbsDown,
  },
  support: {
    label: "Stödparti",
    compactLabel: "Stöd.",
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
    <InteractiveBadge
      currentKey={governmentStatus}
      variants={GOVERNMENT_VARIANTS}
      sectionAnchor="parti-roll"
      popoverTitle="Partiroll"
    >
      <Badge
        variant="outline"
        className={cn(config.className, "border-border gap-1.5", className)}
      >
        <config.icon className="w-3 h-3" />
        {compact ? config.compactLabel : config.label}
      </Badge>
    </InteractiveBadge>
  );
}
