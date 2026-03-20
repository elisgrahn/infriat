import { useState, useEffect, useMemo, useCallback } from "react";
import { useFilters } from "@/store/FilterContext";
import { useAuth } from "@/hooks/useAuth";
import { getMandateType } from "@/lib/utils";
import { fetchPromises, fetchGovernmentPeriods } from "@/services/promises";
import type { PromiseData, GovernmentStatus } from "@/types/promise";
import type { Category } from "@/config/categoryConfig";

export function usePromises() {
  const { isAdmin } = useAuth();
  const {
    selectedParties,
    selectedStatuses,
    selectedGovStatus,
    selectedCategories,
    selectedStatusQuo,
    searchQuery,
    sortBy,
    selectedPeriodId,
    governmentPeriods,
    setGovernmentPeriods,
  } = useFilters();

  const [promises, setPromises] = useState<PromiseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [promiseData, periodData] = await Promise.all([
          fetchPromises(),
          fetchGovernmentPeriods(),
        ]);
        setPromises(promiseData);
        setGovernmentPeriods(periodData);
      } catch {
        // Data already initialized to empty arrays
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGovernmentStatus = useCallback((
    partyName: string,
    electionYear: number,
  ): GovernmentStatus => {
    if (selectedPeriodId) {
      const period = governmentPeriods.find((p) => p.id === selectedPeriodId);
      if (!period) return "opposition";
      if (period.governing_parties.includes(partyName)) return "governing";
      if (period.support_parties?.includes(partyName)) return "support";
      return "opposition";
    }
    return getMandateType(partyName, electionYear, governmentPeriods);
  }, [selectedPeriodId, governmentPeriods]);

  const filteredPromises = useMemo(() => {
    return promises.filter((promise) => {
      if (promise.status === "pending-analysis" && !isAdmin) return false;

      const matchesParty =
        selectedParties.length === 0 ||
        selectedParties.includes(promise.parties.name);

      const statusMap: Record<string, string> = {
        Infriat: "infriat",
        "Delvis infriat": "delvis-infriat",
        Utreds: "utreds",
        "Ej infriat": "ej-infriat",
        Brutet: "brutet",
      };

      const matchesStatus =
        selectedStatuses.length === 0 ||
        selectedStatuses.some((status) => statusMap[status] === promise.status);

      const govStatus = getGovernmentStatus(
        promise.parties.name,
        promise.election_year,
      );
      const matchesGovStatus =
        selectedGovStatus.length === 0 || selectedGovStatus.includes(govStatus);

      const matchesSearch =
        searchQuery === "" ||
        promise.promise_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promise.parties.name.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesPeriod = true;
      if (selectedPeriodId) {
        const period = governmentPeriods.find((p) => p.id === selectedPeriodId);
        if (period) {
          matchesPeriod =
            promise.election_year >= period.start_year &&
            (period.end_year === null ||
              promise.election_year <= period.end_year);
        }
      }

      const matchesCategory =
        selectedCategories.length === 0 ||
        (promise.category != null &&
          selectedCategories.includes(promise.category as Category));

      const matchesStatusQuo =
        selectedStatusQuo.length === 0 ||
        selectedStatusQuo.includes(String(promise.is_status_quo));

      return (
        matchesParty &&
        matchesStatus &&
        matchesGovStatus &&
        matchesSearch &&
        matchesPeriod &&
        matchesCategory &&
        matchesStatusQuo
      );
    });
  }, [
    promises,
    isAdmin,
    selectedParties,
    selectedStatuses,
    selectedGovStatus,
    selectedCategories,
    selectedStatusQuo,
    searchQuery,
    selectedPeriodId,
    governmentPeriods,
    getGovernmentStatus,
  ]);

  const sortedPromises = useMemo(() => {
    const statusRank: Record<string, number> = {
      infriat: 1,
      "delvis-infriat": 2,
      utreds: 3,
      "ej-infriat": 4,
      brutet: 5,
      "pending-analysis": 6,
    };

    return [...filteredPromises].sort((a, b) => {
      switch (sortBy) {
        case "created-desc":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "created-asc":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "year-desc":
          return b.election_year - a.election_year;
        case "year-asc":
          return a.election_year - b.election_year;
        case "measurability-desc":
          return (b.measurability_score || 0) - (a.measurability_score || 0);
        case "measurability-asc":
          return (a.measurability_score || 0) - (b.measurability_score || 0);
        case "status-asc":
          return statusRank[a.status] - statusRank[b.status];
        case "status-desc":
          return statusRank[b.status] - statusRank[a.status];
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [filteredPromises, sortBy]);

  const stats = useMemo(() => {
    const statsPromises = isAdmin
      ? promises
      : promises.filter((p) => p.status !== "pending-analysis");

    return {
      total: statsPromises.length,
      fulfilled: statsPromises.filter((p) => p.status === "infriat").length,
      partiallyFulfilled: statsPromises.filter(
        (p) => p.status === "delvis-infriat",
      ).length,
      broken: statsPromises.filter((p) => p.status === "brutet").length,
      inProgress: statsPromises.filter((p) => p.status === "utreds").length,
      delayed: statsPromises.filter((p) => p.status === "ej-infriat").length,
    };
  }, [promises, isAdmin]);

  // Build a key that changes when any filter changes, used to reset pagination
  const filterKey = useMemo(
    () =>
      JSON.stringify([
        selectedParties,
        selectedStatuses,
        selectedGovStatus,
        selectedCategories,
        selectedStatusQuo,
        searchQuery,
        sortBy,
        selectedPeriodId,
      ]),
    [
      selectedParties,
      selectedStatuses,
      selectedGovStatus,
      selectedCategories,
      selectedStatusQuo,
      searchQuery,
      sortBy,
      selectedPeriodId,
    ],
  );

  const refetchPromises = async () => {
    try {
      const data = await fetchPromises();
      setPromises(data);
    } catch {
      // silently handle
    }
  };

  return {
    promises,
    loading,
    filteredPromises,
    sortedPromises,
    stats,
    filterKey,
    governmentPeriods,
    getGovernmentStatus,
    refetchPromises,
  };
}
