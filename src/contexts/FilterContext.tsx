import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

interface GovernmentPeriod {
  id: string;
  name: string;
  start_year: number;
  end_year: number | null;
  governing_parties: string[];
  support_parties: string[] | null;
}

interface FilterContextType {
  selectedParties: string[];
  setSelectedParties: (parties: string[]) => void;
  selectedStatuses: string[];
  setSelectedStatuses: (statuses: string[]) => void;
  selectedGovStatus: string[];
  setSelectedGovStatus: (govStatus: string[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedPeriodId: string | null;
  setSelectedPeriodId: (periodId: string | null) => void;
  governmentPeriods: GovernmentPeriod[];
  setGovernmentPeriods: (periods: GovernmentPeriod[]) => void;
}

// Mapping between party names and abbreviations
const partyNameToAbbr: Record<string, string> = {
  "Socialdemokraterna": "S",
  "Moderaterna": "M",
  "Sverigedemokraterna": "SD",
  "Centerpartiet": "C",
  "Vänsterpartiet": "V",
  "Kristdemokraterna": "KD",
  "Liberalerna": "L",
  "Miljöpartiet": "MP",
};

const partyAbbrToName: Record<string, string> = Object.fromEntries(
  Object.entries(partyNameToAbbr).map(([name, abbr]) => [abbr, name])
);

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedParties, setSelectedParties] = useState<string[]>(() => {
    const parties = searchParams.get('parties');
    if (!parties) return [];
    // Convert abbreviations from URL to party names
    return parties.split(',').map(abbr => partyAbbrToName[abbr] || abbr).filter(Boolean);
  });
  
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const statuses = searchParams.get('statuses');
    return statuses ? statuses.split(',') : [];
  });
  
  const [selectedGovStatus, setSelectedGovStatus] = useState<string[]>(() => {
    const govStatus = searchParams.get('govStatus');
    return govStatus ? govStatus.split(',') : [];
  });
  
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || "");
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || "created-desc");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(() => searchParams.get('period') || null);
  const [governmentPeriods, setGovernmentPeriods] = useState<GovernmentPeriod[]>([]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (selectedParties.length > 0) {
      // Convert party names to abbreviations for URL
      const abbreviations = selectedParties.map(name => partyNameToAbbr[name] || name).filter(Boolean);
      params.set('parties', abbreviations.join(','));
    } else {
      params.delete('parties');
    }
    
    if (selectedStatuses.length > 0) {
      params.set('statuses', selectedStatuses.join(','));
    } else {
      params.delete('statuses');
    }
    
    if (selectedGovStatus.length > 0) {
      params.set('govStatus', selectedGovStatus.join(','));
    } else {
      params.delete('govStatus');
    }
    
    if (searchQuery) {
      params.set('search', searchQuery);
    } else {
      params.delete('search');
    }
    
    if (sortBy !== 'created-desc') {
      params.set('sort', sortBy);
    } else {
      params.delete('sort');
    }
    
    if (selectedPeriodId) {
      params.set('period', selectedPeriodId);
    } else {
      params.delete('period');
    }
    
    setSearchParams(params, { replace: true });
  }, [selectedParties, selectedStatuses, selectedGovStatus, searchQuery, sortBy, selectedPeriodId]);

  return (
    <FilterContext.Provider
      value={{
        selectedParties,
        setSelectedParties,
        selectedStatuses,
        setSelectedStatuses,
        selectedGovStatus,
        setSelectedGovStatus,
        searchQuery,
        setSearchQuery,
        sortBy,
        setSortBy,
        selectedPeriodId,
        setSelectedPeriodId,
        governmentPeriods,
        setGovernmentPeriods,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
