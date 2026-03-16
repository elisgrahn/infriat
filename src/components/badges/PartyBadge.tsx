import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { getBadgeColor } from "@/utils/partyColors";
import { getPartyAbbreviation } from "@/utils/partyAbbreviations";
import { cn } from "@/lib/utils";

interface PartyBadgeProps {
  party: string;
  abbreviation?: string;
  compact?: boolean;
  className?: string;
}

export function PartyBadge({
  party,
  abbreviation,
  compact = false,
  className,
}: PartyBadgeProps) {
  const compactLabel = abbreviation || getPartyAbbreviation(party) || party;

  return (
    <Badge
      variant="outline"
      className={cn(
        getBadgeColor(party),
        "border-border gap-1.5",
        className,
      )}
    >
      <Users className="w-3 h-3" />
      {compact ? compactLabel : party}
    </Badge>
  );
}
