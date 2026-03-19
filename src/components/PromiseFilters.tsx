import { useRef, useState, useLayoutEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Minus, Check, MoveRight, Lock, ArrowRightLeft } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { partyColors, statusColors } from "@/utils/partyColors";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilters } from "@/contexts/FilterContext";
import { CATEGORY_CONFIG, STATUS_QUO_CONFIG, type Category } from "@/config/categoryConfig";
import { STATUS_CONFIG, VISIBLE_STATUSES } from "@/config/statusConfig";
import { getPartyAbbreviation } from "@/utils/partyAbbreviations";
import { cn } from "@/lib/utils";

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

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[];

interface PromiseFiltersProps {
  showSearch?: boolean;
  showSort?: boolean;
}

/** Shared style for all filter toggle buttons — matches ShareButton exactly */
const TOGGLE_BTN =
  "h-7 gap-1.5 text-xs rounded-full border border-input bg-background shadow-sm transition-all px-2.5 " +
  "data-[state=on]:shadow-none";

/** Section header styled like PromiseDetail headers */
function FilterSectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
      <Icon className="w-4 h-4" />
      {label}
    </h3>
  );
}

export const PromiseFilters = ({
  showSearch = true,
  showSort = true,
}: PromiseFiltersProps = {}) => {
  const {
    selectedParties,
    selectedStatuses,
    selectedCategories,
    selectedStatusQuo,
    searchQuery,
    sortBy,
    governmentPeriods,
    selectedPeriodId,
    setSelectedParties,
    setSelectedStatuses,
    setSelectedCategories,
    setSelectedStatusQuo,
    setSearchQuery,
    setSortBy,
    setSelectedPeriodId,
  } = useFilters();

  // Compact party names when the buttons don't fit in one row
  const partyRowRef = useRef<HTMLDivElement>(null);
  const [compactParties, setCompactParties] = useState(false);

  useLayoutEffect(() => {
    const el = partyRowRef.current;
    if (!el) return;
    const check = () => setCompactParties(el.scrollWidth > el.clientWidth + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Get the selected government period, or the most recent one (current government)
  const selectedPeriod = selectedPeriodId
    ? governmentPeriods.find((p) => p.id === selectedPeriodId)
    : governmentPeriods.length > 0
      ? governmentPeriods.find((p) => p.end_year === null) ||
        governmentPeriods[governmentPeriods.length - 1]
      : null;

  // Custom sort order: V, S, MP, C, L, KD, M, SD
  const partyOrder = [
    "Vänsterpartiet",
    "Socialdemokraterna",
    "Miljöpartiet",
    "Centerpartiet",
    "Liberalerna",
    "Kristdemokraterna",
    "Moderaterna",
    "Sverigedemokraterna",
  ];
  const sortParties = (partyList: string[]) =>
    [...partyList].sort(
      (a, b) => partyOrder.indexOf(a) - partyOrder.indexOf(b),
    );

  const allParties = parties;
  const governingParties = sortParties(selectedPeriod?.governing_parties || []);
  const supportParties = sortParties(selectedPeriod?.support_parties || []);
  const oppositionParties = sortParties(
    allParties.filter(
      (p) => !governingParties.includes(p) && !supportParties.includes(p),
    ),
  );

  const handleGroupToggle = (groupParties: string[]) => {
    const allSelected = groupParties.every((p) => selectedParties.includes(p));
    if (allSelected) {
      setSelectedParties(selectedParties.filter((p) => !groupParties.includes(p)));
    } else {
      const next = [...selectedParties];
      groupParties.forEach((p) => { if (!next.includes(p)) next.push(p); });
      setSelectedParties(next);
    }
  };

  const getGroupState = (groupParties: string[]): "all" | "some" | "none" => {
    const n = groupParties.filter((p) => selectedParties.includes(p)).length;
    if (n === groupParties.length) return "all";
    if (n > 0) return "some";
    return "none";
  };

  const GroupToggle = ({
    label,
    parties: groupParties,
  }: {
    label: string;
    parties: string[];
  }) => {
    const state = getGroupState(groupParties);
    return (
      <button
        onClick={() => handleGroupToggle(groupParties)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div
          className={cn(
            "w-3.5 h-3.5 border rounded flex items-center justify-center transition-colors shrink-0",
            state === "all"
              ? "bg-primary border-primary"
              : state === "some"
                ? "bg-primary/50 border-primary"
                : "border-input",
          )}
        >
          {state === "all" && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
          {state === "some" && <Minus className="w-2.5 h-2.5 text-primary-foreground" />}
        </div>
        {label}
      </button>
    );
  };

  /** A group of party toggle buttons (full or compact) */
  const PartyGroup = ({ groupParties }: { groupParties: string[] }) => (
    <ToggleGroup
      type="multiple"
      value={selectedParties}
      onValueChange={setSelectedParties}
      className="flex flex-wrap gap-1.5 justify-start"
    >
      {groupParties.map((party) => (
        <ToggleGroupItem
          key={party}
          value={party}
          className={cn(TOGGLE_BTN, partyColors[party])}
        >
          {compactParties
            ? (getPartyAbbreviation(party) ?? party)
            : party}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sök efter löften..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Mandatperiod */}
      <div className="space-y-3">
        <FilterSectionHeader icon={Search} label="Mandatperiod" />
        <Select
          value={selectedPeriodId || selectedPeriod?.id || "all"}
          onValueChange={(v) => setSelectedPeriodId(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Välj mandatperiod..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla mandatperioder</SelectItem>
            {governmentPeriods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                {period.name} ({period.start_year}–{period.end_year || "nu"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showSort && (
        <div className="space-y-3">
          <FilterSectionHeader icon={Search} label="Sortera efter" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sortera efter..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created-desc">Skapat datum (fallande)</SelectItem>
              <SelectItem value="created-asc">Skapat datum (stigande)</SelectItem>
              <SelectItem value="year-desc">Valår (fallande)</SelectItem>
              <SelectItem value="year-asc">Valår (stigande)</SelectItem>
              <SelectItem value="measurability-desc">Mätbart (högst först)</SelectItem>
              <SelectItem value="measurability-asc">Mätbart (lägst först)</SelectItem>
              <SelectItem value="status-asc">Status (infriade först)</SelectItem>
              <SelectItem value="status-desc">Status (brutna först)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Status */}
      <div className="space-y-3">
        <FilterSectionHeader icon={Search} label="Status" />
        <ToggleGroup
          type="multiple"
          value={selectedStatuses}
          onValueChange={setSelectedStatuses}
          className="flex flex-wrap gap-1.5 justify-start"
        >
          {VISIBLE_STATUSES.map((status) => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            return (
              <ToggleGroupItem
                key={status}
                value={cfg.label}
                className={cn(TOGGLE_BTN, statusColors[cfg.label])}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {cfg.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {/* Kategorier */}
      <div className="space-y-3">
        <FilterSectionHeader icon={Search} label="Politikområde" />
        <ToggleGroup
          type="multiple"
          value={selectedCategories}
          onValueChange={(v) => setSelectedCategories(v as Category[])}
          className="flex flex-wrap gap-1.5 justify-start"
        >
          {ALL_CATEGORIES.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            return (
              <ToggleGroupItem
                key={cat}
                value={cat}
                className={cn(
                  TOGGLE_BTN,
                  "data-[state=on]:text-white",
                  // off state: muted bg, coloured icon via cfg.colorClass applied to the icon
                  "data-[state=off]:bg-muted data-[state=off]:text-foreground data-[state=off]:hover:bg-muted/80",
                  "data-[state=on]:bg-foreground data-[state=on]:border-foreground",
                )}
              >
                <Icon className={cn("w-3.5 h-3.5 shrink-0", cfg.colorClass)} />
                {cfg.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {/* Bevara / Förändra */}
      <div className="space-y-3">
        <FilterSectionHeader icon={ArrowRightLeft} label="Typ av löfte" />
        <ToggleGroup
          type="multiple"
          value={selectedStatusQuo}
          onValueChange={setSelectedStatusQuo}
          className="flex flex-wrap gap-1.5 justify-start"
        >
          {(["true", "false"] as const).map((key) => {
            const cfg = STATUS_QUO_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <ToggleGroupItem
                key={key}
                value={key}
                className={cn(
                  TOGGLE_BTN,
                  "data-[state=off]:bg-muted data-[state=off]:text-foreground data-[state=off]:hover:bg-muted/80",
                  "data-[state=on]:bg-foreground data-[state=on]:text-white data-[state=on]:border-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {cfg.label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      {/* Parti */}
      <div className="space-y-3">
        <FilterSectionHeader icon={Search} label="Parti" />

        {governingParties.length > 0 && (
          <div className="space-y-2">
            <GroupToggle label="Regeringspartier" parties={governingParties} />
            <div ref={partyRowRef} className="pl-5 overflow-hidden">
              <PartyGroup groupParties={governingParties} />
            </div>
          </div>
        )}

        {supportParties.length > 0 && (
          <div className="space-y-2">
            <GroupToggle label="Stödpartier" parties={supportParties} />
            <div className="pl-5">
              <PartyGroup groupParties={supportParties} />
            </div>
          </div>
        )}

        {oppositionParties.length > 0 && (
          <div className="space-y-2">
            <GroupToggle label="Oppositionspartier" parties={oppositionParties} />
            <div className="pl-5">
              <PartyGroup groupParties={oppositionParties} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
