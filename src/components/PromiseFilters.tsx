import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface PromiseFiltersProps {
  selectedParty: string;
  selectedStatus: string;
  searchQuery: string;
  onPartyChange: (party: string) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (query: string) => void;
}

const parties = ["Alla", "Socialdemokraterna", "Moderaterna", "Sverigedemokraterna", "Centerpartiet", "Vänsterpartiet", "Kristdemokraterna", "Liberalerna", "Miljöpartiet"];
const statuses = ["Alla", "Infriat", "Delvis infriat", "Pågående", "Försenat", "Brutet", "Oklart"];

export const PromiseFilters = ({
  selectedParty,
  selectedStatus,
  searchQuery,
  onPartyChange,
  onStatusChange,
  onSearchChange,
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
        <h3 className="text-sm font-semibold text-foreground">Parti</h3>
        <div className="flex flex-wrap gap-2">
          {parties.map((party) => (
            <Button
              key={party}
              variant={selectedParty === party ? "default" : "outline"}
              size="sm"
              onClick={() => onPartyChange(party)}
              className="transition-all"
            >
              {party}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Status</h3>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Button
              key={status}
              variant={selectedStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => onStatusChange(status)}
              className="transition-all"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};
