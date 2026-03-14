import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { getBadgeColor } from "@/utils/partyColors";
import { cn } from "@/lib/utils";

interface PartyBadgeProps {
  party: string;
  className?: string;
}

export function PartyBadge({ party, className }: PartyBadgeProps) {
  return (
    <Badge className={cn(getBadgeColor(party), "gap-1.5", className)}>
      <Users className="w-3 h-3" />
      {party}
    </Badge>
  );
}
