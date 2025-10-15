import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { partyColors, statusColors } from "@/utils/partyColors";

interface PromiseFiltersProps {
  selectedParties: string[];
  selectedStatuses: string[];
  searchQuery: string;
  onPartiesChange: (parties: string[]) => void;
  onStatusesChange: (statuses: string[]) => void;
  onSearchChange: (query: string) => void;
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
  searchQuery,
  onPartiesChange,
  onStatusesChange,
  onSearchChange,
}: PromiseFiltersProps) => {
  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
        <Input
          placeholder="Sök efter löften..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Parti</h3>
        <ToggleGroup
          type="multiple"
          value={selectedParties}
          onValueChange={onPartiesChange}
          className="flex flex-wrap gap-2 justify-start"
        >
          {parties.map((party) => (
            <ToggleGroupItem
              key={party}
              value={party}
              className={`transition-all text-sm data-[state=on]:text-gray-900 ${partyColors[party]}`}
            >
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
            <ToggleGroupItem
              key={status}
              value={status}
              className={`transition-all text-sm data-[state=on]:text-gray-900 ${statusColors[status]}`}
            >
              {status}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};
