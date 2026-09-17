import { Link } from "@tanstack/react-router";
import { PARTY_ORDER } from "@/lib/partyStats";
import { PARTY_ABBREVIATION_TO_NAME } from "@/utils/partyAbbreviations";
import { getBadgeColor } from "@/utils/partyColors";

/** Quick-link chips under the hero — jump straight to a party's detail page */
export function PartyQuickLinks() {
  return (
    <nav aria-label="Snabblänkar till partierna" className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">Snabbt till ett parti:</span>
        {PARTY_ORDER.map((abbr) => (
          <Link
            key={abbr}
            to="/parti/$kort"
            params={{ kort: abbr }}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={`inline-flex size-4 items-center justify-center rounded text-[9px] font-semibold ${getBadgeColor(PARTY_ABBREVIATION_TO_NAME[abbr])}`}
            >
              {abbr}
            </span>
            <span className="hidden sm:inline">{PARTY_ABBREVIATION_TO_NAME[abbr]}</span>
            <span className="sm:hidden">{abbr}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
