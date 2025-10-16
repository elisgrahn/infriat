import { Input } from "@/components/ui/input";
import { Search, Minus, Check } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { partyColors, statusColors } from "@/utils/partyColors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
  selectedPeriodId: string | null;
  onPartiesChange: (parties: string[]) => void;
  onStatusesChange: (statuses: string[]) => void;
  onGovStatusChange: (status: string[]) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: string) => void;
  onPeriodChange: (periodId: string | null) => void;
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
  selectedPeriodId,
  onPartiesChange,
  onStatusesChange,
  onGovStatusChange,
  onSearchChange,
  onSortChange,
  onPeriodChange,
}: PromiseFiltersProps) => {
  // Get the selected government period, or the most recent one
  const selectedPeriod = selectedPeriodId 
    ? governmentPeriods.find(p => p.id === selectedPeriodId)
    : governmentPeriods.length > 0 
      ? governmentPeriods.reduce((latest, period) => 
          (period.end_year === null || (latest.end_year !== null && period.end_year > latest.end_year)) 
            ? period 
            : latest
        )
      : null;

  const allParties = parties;
  const governingParties = selectedPeriod?.governing_parties || [];
  const supportParties = selectedPeriod?.support_parties || [];
  const oppositionParties = allParties.filter(
    party => !governingParties.includes(party) && !supportParties.includes(party)
  );

  const handleGroupToggle = (groupParties: string[]) => {
    const allSelected = groupParties.every(party => selectedParties.includes(party));
    
    if (allSelected) {
      // Deselect all parties in this group
      onPartiesChange(selectedParties.filter(party => !groupParties.includes(party)));
    } else {
      // Select all parties in this group
      const newSelection = [...selectedParties];
      groupParties.forEach(party => {
        if (!newSelection.includes(party)) {
          newSelection.push(party);
        }
      });
      onPartiesChange(newSelection);
    }
  };

  const getGroupState = (groupParties: string[]): 'all' | 'some' | 'none' => {
    const selectedCount = groupParties.filter(party => selectedParties.includes(party)).length;
    if (selectedCount === groupParties.length) return 'all';
    if (selectedCount > 0) return 'some';
    return 'none';
  };

  const GroupToggle = ({ label, parties: groupParties }: { label: string; parties: string[] }) => {
    const state = getGroupState(groupParties);
    
    return (
      <button
        onClick={() => handleGroupToggle(groupParties)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
          state === 'all' ? 'bg-primary border-primary' : 
          state === 'some' ? 'bg-primary/50 border-primary' : 
          'border-input'
        }`}>
          {state === 'all' && <Check className="w-3 h-3 text-primary-foreground" />}
          {state === 'some' && <Minus className="w-3 h-3 text-primary-foreground" />}
        </div>
        {label}
      </button>
    );
  };
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
        <h3 className="text-sm font-semibold text-foreground">Mandatperiod</h3>
        <Select 
          value={selectedPeriodId || (selectedPeriod?.id || 'all')} 
          onValueChange={(value) => onPeriodChange(value === 'all' ? null : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Välj mandatperiod..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla mandatperioder</SelectItem>
            {governmentPeriods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                {period.name} ({period.start_year}–{period.end_year || 'nu'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <div className="space-y-2">
            <GroupToggle label="Regeringspartier" parties={governingParties} />
            <div className="pl-6">
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
            </div>
          </div>
        )}

        {supportParties.length > 0 && (
          <div className="space-y-2">
            <GroupToggle label="Stödpartier" parties={supportParties} />
            <div className="pl-6">
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
            </div>
          </div>
        )}

        {oppositionParties.length > 0 && (
          <div className="space-y-2">
            <GroupToggle label="Oppositionspartier" parties={oppositionParties} />
            <div className="pl-6">
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
            </div>
          </div>
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
