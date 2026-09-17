import { Link } from "@tanstack/react-router";
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
  /** When set, the badge links to that party's detail page (/parti/:kort). */
  linkToPartyPage?: string;
}

export function PartyBadge({
  party,
  abbreviation,
  compact = false,
  className,
  linkToPartyPage,
}: PartyBadgeProps) {
  const compactLabel = abbreviation || getPartyAbbreviation(party) || party;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        getBadgeColor(party),
        "border-border gap-1.5",
        linkToPartyPage &&
          "cursor-pointer transition-[filter,background-color] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Users className="w-3 h-3" />
      {compact ? compactLabel : party}
    </Badge>
  );

  if (!linkToPartyPage) return badge;

  return (
    <Link
      to="/parti/$kort"
      params={{ kort: linkToPartyPage }}
      aria-label={`Se löften från ${party}`}
      className="inline-flex"
    >
      {badge}
    </Link>
  );
}
