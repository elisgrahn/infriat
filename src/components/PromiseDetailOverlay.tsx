import { useState, useEffect, useRef, useCallback } from "react";
import {
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayHeader,
  ResponsiveOverlayHeaderExtras,
  ResponsiveOverlayTitle,
} from "@/components/ui/ResponsiveOverlay";
import {
  PromiseDetailContent,
  type PromiseDetailHeaderData,
} from "@/components/PromiseDetailContent";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/badgeConfig";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PartyBadge } from "@/components/badges/PartyBadge";
import { GovernmentBadge } from "@/components/badges/GovernmentBadge";
import { MeasurabilityBadge } from "@/components/badges/MeasurabilityBadge";
import { CategoryBadge } from "@/components/badges/CategoryBadge";
import { StatusQuoBadge } from "@/components/badges/StatusQuoBadge";

const OVERLAY_STATE_KEY = "promise-detail-overlay-state-v1";

type StoredOverlayState = {
  lastPromiseId?: string;
  resolvedStatus?: {
    promiseId?: string;
    status: PromiseStatus;
  };
  headerDataByPromiseId?: Record<string, PromiseDetailHeaderData>;
};

function readStoredOverlayState(): StoredOverlayState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(OVERLAY_STATE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredOverlayState;
  } catch {
    return {};
  }
}

interface PromiseDetailOverlayProps {
  promiseId?: string;
  initialStatus?: PromiseStatus;
  onClose: () => void;
}

export function PromiseDetailOverlay({
  promiseId,
  initialStatus,
  onClose,
}: PromiseDetailOverlayProps) {
  const headerDataByPromiseIdRef = useRef<Record<string, PromiseDetailHeaderData>>({});
  const [storedState] = useState<StoredOverlayState>(() => readStoredOverlayState());

  // Internal open state so we can let the exit animation finish before calling onClose
  const [open, setOpen] = useState(Boolean(promiseId));

  // Track the last non-undefined promiseId so content stays visible during exit animation
  const [lastPromiseId, setLastPromiseId] = useState<string | undefined>(
    promiseId ?? storedState.lastPromiseId,
  );

  const [resolvedStatus, setResolvedStatus] = useState<{
    promiseId?: string;
    status: PromiseStatus;
  }>(
    storedState.resolvedStatus ?? {
      promiseId,
      status: initialStatus ?? "pending-analysis",
    },
  );

  const [headerDataByPromiseId, setHeaderDataByPromiseId] = useState<
    Record<string, PromiseDetailHeaderData>
  >(storedState.headerDataByPromiseId ?? {});

  useEffect(() => {
    headerDataByPromiseIdRef.current = headerDataByPromiseId;
  }, [headerDataByPromiseId]);

  const [headerData, setHeaderData] = useState<PromiseDetailHeaderData | null>(
    promiseId ? (storedState.headerDataByPromiseId?.[promiseId] ?? null) : null,
  );

  // Sync open state when promiseId changes from parent
  useEffect(() => {
    if (promiseId) {
      setLastPromiseId(promiseId);
      setOpen(true);
      setHeaderData(headerDataByPromiseIdRef.current[promiseId] ?? null);
    } else {
      setOpen(false);
    }
  }, [promiseId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stateToStore: StoredOverlayState = {
      lastPromiseId,
      resolvedStatus,
      headerDataByPromiseId,
    };
    window.sessionStorage.setItem(OVERLAY_STATE_KEY, JSON.stringify(stateToStore));
  }, [lastPromiseId, resolvedStatus, headerDataByPromiseId]);

  const activePromiseId = lastPromiseId;
  const activePromiseIdRef = useRef(activePromiseId);
  activePromiseIdRef.current = activePromiseId;

  const activeStatus =
    resolvedStatus.promiseId === activePromiseId
      ? resolvedStatus.status
      : (initialStatus ?? "pending-analysis");

  const statusBorderClass = STATUS_CONFIG[activeStatus].borderColor;
  const drawerBorderClass = STATUS_CONFIG[activeStatus].topBorderColor;

  // Called by the close button inside PromiseDetailContent — start dismiss animation
  const handleClose = () => setOpen(false);

  const handleOverlayCloseComplete = () => {
    onClose();
  };

  const handleHeaderDataChange = useCallback((data: PromiseDetailHeaderData | null) => {
    setHeaderData(data);
    const id = activePromiseIdRef.current;
    if (!id) return;
    setHeaderDataByPromiseId((prev) => {
      if (!data) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return {
        ...prev,
        [id]: data,
      };
    });
  }, []);

  const title = headerData?.title ?? "Löftesdetaljer";

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setOpen(false);
      }}
      onCloseComplete={handleOverlayCloseComplete}
    >
      <ResponsiveOverlayContent
        className="flex flex-col w-full max-w-[100vw] p-0 bg-card backdrop-blur supports-[backdrop-filter]:bg-card/95 dark:supports-[backdrop-filter]:bg-card/80"
        mobileClassName={cn("max-h-[75vh] border-t-4 rounded-t-2xl", drawerBorderClass)}
        desktopClassName={cn("sm:max-w-2xl border-l-4 rounded-l-2xl gap-0", statusBorderClass)}
        side="right"  
        onCloseComplete={handleOverlayCloseComplete}
      >
        <ResponsiveOverlayHeader
          className="flex-none min-w-0 p-6 pb-4 border-b"
          mobileClassName="pt-2 gap-0"
        >
          <ResponsiveOverlayTitle className="text-left leading-snug break-words">
            {title}
          </ResponsiveOverlayTitle>

          {headerData && (
            <ResponsiveOverlayHeaderExtras
              mobileClassName="py-2"
              desktopClassName="pb-2"
            >
              <div className="flex w-max min-w-full flex-nowrap items-center gap-2">
                <StatusBadge status={headerData.status} className="shrink-0" />
                <PartyBadge party={headerData.partyName} compact={false} className="shrink-0" />
                <GovernmentBadge
                  governmentStatus={headerData.governmentStatus}
                  compact={false}
                  className="shrink-0"
                />
                {headerData.measurabilityScore !== null && (
                  <MeasurabilityBadge
                    score={headerData.measurabilityScore}
                    compact={false}
                    className="shrink-0"
                  />
                )}
                {headerData.isStatusQuo !== null && (
                  <StatusQuoBadge
                    isStatusQuo={headerData.isStatusQuo}
                    compact={false}
                    className="shrink-0"
                  />
                )}
                {headerData.category && (
                  <CategoryBadge
                    category={headerData.category}
                    compact={false}
                    className="shrink-0"
                  />
                )}
              </div>
            </ResponsiveOverlayHeaderExtras>
          )}
        </ResponsiveOverlayHeader>

        <ResponsiveOverlayBody className="flex-1 overflow-y-auto p-6 pt-4">
          <PromiseDetailContent
            key={activePromiseId}
            promiseId={activePromiseId!}
            onClose={handleClose}
            onStatusChange={(status) =>
              setResolvedStatus({ promiseId: activePromiseId, status })
            }
            onHeaderDataChange={handleHeaderDataChange}
          />
        </ResponsiveOverlayBody>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
}
