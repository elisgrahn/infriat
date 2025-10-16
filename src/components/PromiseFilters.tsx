import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { partyColors, statusColors } from "@/utils/partyColors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface GovernmentPeriod {
  id: string;
  name: string;
  start_year: number;
  end_year: number | null;
  governing_parties: string[];
  support_parties: string[] | null;
}

interface PromiseFiltersProps {
  selectedParties: string[];
  selectedStatuses: string[];
  selectedGovStatus: string[];
  searchQuery: string;
  sortBy: string;
  governmentPeriods: GovernmentPeriod[];
  onPartiesChange: (parties: string[]) => void;
  onStatusesChange: (statuses: string[]) => void;
  onGovStatusChange: (status: string[]) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: string) => void;
}

const parties = [
  "Socialdemokraterna",
  "Moderaterna",
  "Sverigedemokraterna",
  "Centerpartiet",
  "Vänsterpartiet",
  "Kristdemokraterna",
  "Liberalerna",
  "Miljöpartiet",
];
const statuses = ["Infriat", "Delvis infriat", "Pågående", "Försenat", "Brutet", "Oklart"];

export const PromiseFilters = ({
  selectedParties,
  selectedStatuses,
  selectedGovStatus,
  searchQuery,
  sortBy,
  governmentPeriods,
  onPartiesChange,
  onStatusesChange,
  onGovStatusChange,
  onSearchChange,
  onSortChange,
}: PromiseFiltersProps) => {
  const [governingOpen, setGoverningOpen] = useState(true);
  const [supportOpen, setSupportOpen] = useState(true);
  const [oppositionOpen, setOppositionOpen] = useState(true);

  // Get the most recent government period
  const latestPeriod = governmentPeriods.length > 0 
    ? governmentPeriods.reduce((latest, period) => 
        (period.end_year === null || (latest.end_year !== null && period.end_year > latest.end_year)) 
          ? period 
          : latest
      )
    : null;

  const allParties = parties;
  const governingParties = latestPeriod?.governing_parties || [];
  const supportParties = latestPeriod?.support_parties || [];
  const oppositionParties = allParties.filter(
    party => !governingParties.includes(party) && !supportParties.includes(party)
  );
  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Sök efter löften..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Sortera efter</h3>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sortera efter..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created-desc">Skapat datum (fallande)</SelectItem>
            <SelectItem value="created-asc">Skapat datum (stigande)</SelectItem>
            <SelectItem value="year-desc">Valår (fallande)</SelectItem>
            <SelectItem value="year-asc">Valår (stigande)</SelectItem>
            <SelectItem value="measurability-desc">Mätbarhet (högst först)</SelectItem>
            <SelectItem value="measurability-asc">Mätbarhet (lägst först)</SelectItem>
            <SelectItem value="status-asc">Status (infriade först)</SelectItem>
            <SelectItem value="status-desc">Status (brutna först)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Parti</h3>
        
        {governingParties.length > 0 && (
          <Collapsible open={governingOpen} onOpenChange={setGoverningOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={`w-4 h-4 transition-transform ${governingOpen ? 'rotate-0' : '-rotate-90'}`} />
              Regeringspartier
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ToggleGroup
                type="multiple"
                value={selectedParties}
                onValueChange={onPartiesChange}
                className="flex flex-wrap gap-2 justify-start"
              >
                {governingParties.map((party) => (
                  <ToggleGroupItem key={party} value={party} className={`transition-all text-sm ${partyColors[party]}`}>
                    {party}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </CollapsibleContent>
          </Collapsible>
        )}

        {supportParties.length > 0 && (
          <Collapsible open={supportOpen} onOpenChange={setSupportOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={`w-4 h-4 transition-transform ${supportOpen ? 'rotate-0' : '-rotate-90'}`} />
              Stödpartier
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ToggleGroup
                type="multiple"
                value={selectedParties}
                onValueChange={onPartiesChange}
                className="flex flex-wrap gap-2 justify-start"
              >
                {supportParties.map((party) => (
                  <ToggleGroupItem key={party} value={party} className={`transition-all text-sm ${partyColors[party]}`}>
                    {party}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </CollapsibleContent>
          </Collapsible>
        )}

        {oppositionParties.length > 0 && (
          <Collapsible open={oppositionOpen} onOpenChange={setOppositionOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={`w-4 h-4 transition-transform ${oppositionOpen ? 'rotate-0' : '-rotate-90'}`} />
              Oppositionspartier
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <ToggleGroup
                type="multiple"
                value={selectedParties}
                onValueChange={onPartiesChange}
                className="flex flex-wrap gap-2 justify-start"
              >
                {oppositionParties.map((party) => (
                  <ToggleGroupItem key={party} value={party} className={`transition-all text-sm ${partyColors[party]}`}>
                    {party}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Status</h3>
        <ToggleGroup
          type="multiple"
          value={selectedStatuses}
          onValueChange={onStatusesChange}
          className="flex flex-wrap gap-2 justify-start"
        >
          {statuses.map((status) => (
            <ToggleGroupItem key={status} value={status} className={`transition-all text-sm ${statusColors[status]}`}>
              {status}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};
