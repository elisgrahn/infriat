import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { PromiseFilters } from "@/components/PromiseFilters";
import { cn } from "@/lib/utils";
import { useStickyBar } from "@/store/StickyBarContext";
import { useFilters } from "@/store/FilterContext";
import { SORT_OPTIONS } from "@/types/promise";

interface MobileFilterBarProps {
  filteredCount: number;
}

export function MobileFilterBar({ filteredCount }: MobileFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const { isMobileBarStuck, setMobileBarStuck } = useStickyBar();
  const { searchQuery, setSearchQuery, sortBy, setSortBy } = useFilters();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setMobileBarStuck(!entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px", threshold: 1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [setMobileBarStuck]);

  const filterLabel =
    filteredCount === 1 ? "1 löfte" : `${filteredCount} löften`;

  return (
    <>
      {/* Sentinel: sits just above the sticky bar; becomes hidden when bar is stuck */}
      <div
        ref={sentinelRef}
        className="lg:hidden h-px"
        aria-hidden="true"
      />
      <div className="lg:hidden sticky top-[56px] z-30 -mx-4 mb-2">
        <div className="px-4 text-muted-foreground bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 py-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Sök löften..."
                className="pl-9 h-8 text-sm"
              />
            </div>

            <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8"
                  aria-label="Filtrera"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtrera</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh] rounded-t-2xl bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                <DrawerHeader>
                  <DrawerTitle>
                    Filtrera ({filterLabel})
                  </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 overflow-y-auto">
                  <PromiseFilters showSearch={false} showSort={false} />
                </div>
              </DrawerContent>
            </Drawer>

            <Drawer open={sortOpen} onOpenChange={setSortOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8"
                  aria-label="Sortera"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Sortera</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh] rounded-t-2xl bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                <DrawerHeader>
                  <DrawerTitle>Sortera löften</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 space-y-2 overflow-y-auto">
                  {SORT_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={sortBy === option.value ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSortBy(option.value);
                        setSortOpen(false);
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
        <div className={cn(isMobileBarStuck ? "border-b" : "h-px")} />
      </div>
    </>
  );
}
