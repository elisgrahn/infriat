import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PromiseFilters } from "@/components/PromiseFilters";
import { cn } from "@/lib/utils";
import { useFilters } from "@/store/FilterContext";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

interface DesktopFilterSidebarProps {
  filteredCount: number;
}

export function DesktopFilterSidebar({ filteredCount }: DesktopFilterSidebarProps) {
  const { searchQuery, setSearchQuery } = useFilters();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Keep local state in sync when context changes externally
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 300);
  };

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const filterLabel =
    filteredCount === 1 ? "1 löfte" : `${filteredCount} löften`;

  return (
    <aside className="hidden lg:block lg:col-span-1">
      <Card className="sticky top-20 bg-card rounded-2xl border max-h-[calc(100vh-6rem)] flex flex-col">
        <CardHeader className="p-6 pb-4 space-y-4 shrink-0">
          <CardTitle className="text-lg font-bold text-foreground">
            Filtrera ({filterLabel})
          </CardTitle>
          <InputGroup>
            <InputGroupInput
              placeholder="Sök efter löften..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon
              align="inline-end"
              className={cn(!localSearch && "invisible")}
            >
              <InputGroupButton
                aria-label="Rensa sökning"
                title="Rensa sökning"
                size="icon-xs"
                onClick={() => handleSearchChange("")}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </CardHeader>
        <div className="px-6 pb-6 overflow-y-auto">
          <PromiseFilters showSearch={false} />
        </div>
      </Card>
    </aside>
  );
}
