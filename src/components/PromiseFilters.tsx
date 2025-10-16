import { Input } from "@/components/ui/input";
import { Search, Building2, Users2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { partyColors, statusColors } from "@/utils/partyColors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface PromiseFiltersProps {
  selectedParties: string[];
  selectedStatuses: string[];
  selectedGovStatus: string[];
  searchQuery: string;
  sortBy: string;
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
  onPartiesChange,
  onStatusesChange,
  onGovStatusChange,
  onSearchChange,
  onSortChange,
}: PromiseFiltersProps) => {
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
        
        <div className="flex gap-2 mb-3">
          <Button
            variant={selectedGovStatus.includes('governing') ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (selectedGovStatus.includes('governing')) {
                onGovStatusChange(selectedGovStatus.filter(s => s !== 'governing'));
              } else {
                onGovStatusChange([...selectedGovStatus, 'governing']);
              }
            }}
            className="flex-1 gap-1.5"
          >
            <Building2 className="w-3 h-3" />
            Regeringspartier
          </Button>
          <Button
            variant={selectedGovStatus.includes('opposition') ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (selectedGovStatus.includes('opposition')) {
                onGovStatusChange(selectedGovStatus.filter(s => s !== 'opposition'));
              } else {
                onGovStatusChange([...selectedGovStatus, 'opposition']);
              }
            }}
            className="flex-1 gap-1.5"
          >
            <Users2 className="w-3 h-3" />
            Oppositionspartier
          </Button>
        </div>
        
        <ToggleGroup
          type="multiple"
          value={selectedParties}
          onValueChange={onPartiesChange}
          className="flex flex-wrap gap-2 justify-start"
        >
          {parties.map((party) => (
            <ToggleGroupItem key={party} value={party} className={`transition-all text-sm ${partyColors[party]}`}>
              {party}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
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
