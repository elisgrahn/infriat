import { createContext, useContext, useReducer, useEffect, useMemo, useRef, useCallback, ReactNode, Dispatch } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  PARTY_ABBREVIATION_TO_NAME,
  getPartyAbbreviation,
} from '@/utils/partyAbbreviations';
import type { Category } from '@/config/badgeConfig';
import type { GovernmentPeriod } from '@/types/promise';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface FilterState {
  selectedParties: string[];
  selectedStatuses: string[];
  selectedGovStatus: string[];
  selectedCategories: Category[];
  selectedStatusQuo: string[];
  searchQuery: string;
  sortBy: string;
  selectedPeriodId: string | null;
  governmentPeriods: GovernmentPeriod[];
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type FilterAction =
  | { type: 'SET_PARTIES'; payload: string[] }
  | { type: 'SET_STATUSES'; payload: string[] }
  | { type: 'SET_GOV_STATUS'; payload: string[] }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_STATUS_QUO'; payload: string[] }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_SORT'; payload: string }
  | { type: 'SET_PERIOD'; payload: string | null }
  | { type: 'SET_GOVERNMENT_PERIODS'; payload: GovernmentPeriod[] };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_PARTIES':
      return { ...state, selectedParties: action.payload };
    case 'SET_STATUSES':
      return { ...state, selectedStatuses: action.payload };
    case 'SET_GOV_STATUS':
      return { ...state, selectedGovStatus: action.payload };
    case 'SET_CATEGORIES':
      return { ...state, selectedCategories: action.payload };
    case 'SET_STATUS_QUO':
      return { ...state, selectedStatusQuo: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_SORT':
      return { ...state, sortBy: action.payload };
    case 'SET_PERIOD':
      return { ...state, selectedPeriodId: action.payload };
    case 'SET_GOVERNMENT_PERIODS':
      return { ...state, governmentPeriods: action.payload };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Dispatch helpers — stable callbacks consumers can call without re-rendering
// ---------------------------------------------------------------------------

interface FilterDispatch {
  setSelectedParties: (parties: string[]) => void;
  setSelectedStatuses: (statuses: string[]) => void;
  setSelectedGovStatus: (govStatus: string[]) => void;
  setSelectedCategories: (categories: Category[]) => void;
  setSelectedStatusQuo: (statusQuo: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: string) => void;
  setSelectedPeriodId: (periodId: string | null) => void;
  setGovernmentPeriods: (periods: GovernmentPeriod[]) => void;
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const FilterStateContext = createContext<FilterState | undefined>(undefined);
const FilterDispatchContext = createContext<FilterDispatch | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialState: FilterState = useMemo(() => ({
    selectedParties: (() => {
      const parties = searchParams.get('parties');
      if (!parties) return [];
      return parties.split(',').map(abbr => PARTY_ABBREVIATION_TO_NAME[abbr] || abbr).filter(Boolean);
    })(),
    selectedStatuses: (() => {
      const statuses = searchParams.get('statuses');
      return statuses ? statuses.split(',') : [];
    })(),
    selectedGovStatus: (() => {
      const govStatus = searchParams.get('govStatus');
      return govStatus ? govStatus.split(',') : [];
    })(),
    selectedCategories: (() => {
      const cats = searchParams.get('categories');
      return cats ? (cats.split(',') as Category[]) : [];
    })(),
    selectedStatusQuo: (() => {
      const sq = searchParams.get('statusQuo');
      return sq ? sq.split(',') : [];
    })(),
    searchQuery: searchParams.get('search') || '',
    sortBy: searchParams.get('sort') || 'created-desc',
    selectedPeriodId: searchParams.get('period') || null,
    governmentPeriods: [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);  // Only read URL on mount

  const [state, dispatch] = useReducer(filterReducer, initialState);

  // Stable dispatch helpers — these never change identity
  const dispatchers = useMemo<FilterDispatch>(() => ({
    setSelectedParties: (v) => dispatch({ type: 'SET_PARTIES', payload: v }),
    setSelectedStatuses: (v) => dispatch({ type: 'SET_STATUSES', payload: v }),
    setSelectedGovStatus: (v) => dispatch({ type: 'SET_GOV_STATUS', payload: v }),
    setSelectedCategories: (v) => dispatch({ type: 'SET_CATEGORIES', payload: v }),
    setSelectedStatusQuo: (v) => dispatch({ type: 'SET_STATUS_QUO', payload: v }),
    setSearchQuery: (v) => dispatch({ type: 'SET_SEARCH', payload: v }),
    setSortBy: (v) => dispatch({ type: 'SET_SORT', payload: v }),
    setSelectedPeriodId: (v) => dispatch({ type: 'SET_PERIOD', payload: v }),
    setGovernmentPeriods: (v) => dispatch({ type: 'SET_GOVERNMENT_PERIODS', payload: v }),
  }), []);

  // Debounced URL sync
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(urlSyncTimerRef.current);
    urlSyncTimerRef.current = setTimeout(() => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);

        if (state.selectedParties.length > 0) {
          const abbreviations = state.selectedParties.map(name => getPartyAbbreviation(name) || name).filter(Boolean);
          params.set('parties', abbreviations.join(','));
        } else {
          params.delete('parties');
        }

        if (state.selectedStatuses.length > 0) {
          params.set('statuses', state.selectedStatuses.join(','));
        } else {
          params.delete('statuses');
        }

        if (state.selectedGovStatus.length > 0) {
          params.set('govStatus', state.selectedGovStatus.join(','));
        } else {
          params.delete('govStatus');
        }

        if (state.selectedCategories.length > 0) {
          params.set('categories', state.selectedCategories.join(','));
        } else {
          params.delete('categories');
        }

        if (state.selectedStatusQuo.length > 0) {
          params.set('statusQuo', state.selectedStatusQuo.join(','));
        } else {
          params.delete('statusQuo');
        }

        if (state.searchQuery) {
          params.set('search', state.searchQuery);
        } else {
          params.delete('search');
        }

        if (state.sortBy !== 'created-desc') {
          params.set('sort', state.sortBy);
        } else {
          params.delete('sort');
        }

        if (state.selectedPeriodId) {
          params.set('period', state.selectedPeriodId);
        } else {
          params.delete('period');
        }

        return params;
      }, { replace: true });
    }, 150);

    return () => clearTimeout(urlSyncTimerRef.current);
  }, [
    state.selectedParties,
    state.selectedStatuses,
    state.selectedGovStatus,
    state.selectedCategories,
    state.selectedStatusQuo,
    state.searchQuery,
    state.sortBy,
    state.selectedPeriodId,
    setSearchParams,
  ]);

  return (
    <FilterStateContext.Provider value={state}>
      <FilterDispatchContext.Provider value={dispatchers}>
        {children}
      </FilterDispatchContext.Provider>
    </FilterStateContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Read-only filter state — re-renders when any filter value changes */
export const useFilterState = () => {
  const context = useContext(FilterStateContext);
  if (context === undefined) {
    throw new Error('useFilterState must be used within a FilterProvider');
  }
  return context;
};

/** Stable dispatch setters — never causes re-renders on its own */
export const useFilterDispatch = () => {
  const context = useContext(FilterDispatchContext);
  if (context === undefined) {
    throw new Error('useFilterDispatch must be used within a FilterProvider');
  }
  return context;
};

/**
 * Combined hook — returns both state + dispatch.
 * Prefer useFilterState / useFilterDispatch individually to avoid unnecessary re-renders.
 * @deprecated Use useFilterState and useFilterDispatch separately for better performance.
 */
export const useFilters = () => {
  const state = useFilterState();
  const dispatch = useFilterDispatch();
  return { ...state, ...dispatch };
};
