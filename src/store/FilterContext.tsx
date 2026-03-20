import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PARTY_ABBREVIATION_TO_NAME,
  getPartyAbbreviation,
} from '@/utils/partyAbbreviations';
import type { Category } from '@/config/categoryConfig';
import type { GovernmentPeriod } from '@/types/promise';

interface FilterContextType {
  selectedParties: string[];
  setSelectedParties: (parties: string[]) => void;
  selectedStatuses: string[];
  setSelectedStatuses: (statuses: string[]) => void;
  selectedGovStatus: string[];
  setSelectedGovStatus: (govStatus: string[]) => void;
  selectedCategories: Category[];
  setSelectedCategories: (categories: Category[]) => void;
  selectedStatusQuo: string[];
  setSelectedStatusQuo: (statusQuo: string[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  selectedPeriodId: string | null;
  setSelectedPeriodId: (periodId: string | null) => void;
  governmentPeriods: GovernmentPeriod[];
  setGovernmentPeriods: (periods: GovernmentPeriod[]) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedParties, setSelectedParties] = useState<string[]>(() => {
    const parties = searchParams.get('parties');
    if (!parties) return [];
    return parties.split(',').map(abbr => PARTY_ABBREVIATION_TO_NAME[abbr] || abbr).filter(Boolean);
  });
  
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const statuses = searchParams.get('statuses');
    return statuses ? statuses.split(',') : [];
  });
  
  const [selectedGovStatus, setSelectedGovStatus] = useState<string[]>(() => {
    const govStatus = searchParams.get('govStatus');
    return govStatus ? govStatus.split(',') : [];
  });

  const [selectedCategories, setSelectedCategories] = useState<Category[]>(() => {
    const cats = searchParams.get('categories');
    return cats ? (cats.split(',') as Category[]) : [];
  });

  const [selectedStatusQuo, setSelectedStatusQuo] = useState<string[]>(() => {
    const sq = searchParams.get('statusQuo');
    return sq ? sq.split(',') : [];
  });
  
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || "");
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || "created-desc");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(() => searchParams.get('period') || null);
  const [governmentPeriods, setGovernmentPeriods] = useState<GovernmentPeriod[]>([]);

  // Update URL when filters change – use the callback form of setSearchParams
  // so we always read the *latest* params and never accidentally strip unrelated
  // query params (e.g. ?promise=).
  useEffect(() => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);

      if (selectedParties.length > 0) {
        const abbreviations = selectedParties.map(name => getPartyAbbreviation(name) || name).filter(Boolean);
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

      if (selectedCategories.length > 0) {
        params.set('categories', selectedCategories.join(','));
      } else {
        params.delete('categories');
      }

      if (selectedStatusQuo.length > 0) {
        params.set('statusQuo', selectedStatusQuo.join(','));
      } else {
        params.delete('statusQuo');
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

      return params;
    }, { replace: true });
  }, [selectedParties, selectedStatuses, selectedGovStatus, selectedCategories, selectedStatusQuo, searchQuery, sortBy, selectedPeriodId, setSearchParams]);

  return (
    <FilterContext.Provider
      value={{
        selectedParties,
        setSelectedParties,
        selectedStatuses,
        setSelectedStatuses,
        selectedGovStatus,
        setSelectedGovStatus,
        selectedCategories,
        setSelectedCategories,
        selectedStatusQuo,
        setSelectedStatusQuo,
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
