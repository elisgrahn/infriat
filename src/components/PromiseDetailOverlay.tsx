import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  PromiseDetailContent,
  type PromiseDetailHeaderData,
} from "@/components/PromiseDetailContent";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";
import { StatusBadge } from "@/components/badges/StatusBadge";
import { PartyBadge } from "@/components/badges/PartyBadge";
import { GovernmentBadge } from "@/components/badges/GovernmentBadge";
import { MeasurabilityBadge } from "@/components/badges/MeasurabilityBadge";

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
  const isMobile = useIsMobile();

  // Internal open state so we can let the exit animation finish before calling onClose
  const [open, setOpen] = useState(Boolean(promiseId));

  // Track the last non-undefined promiseId so content stays visible during exit animation
  const [lastPromiseId, setLastPromiseId] = useState<string | undefined>(promiseId);

  const [resolvedStatus, setResolvedStatus] = useState<{
    promiseId?: string;
    status: PromiseStatus;
  }>({
    promiseId,
    status: initialStatus ?? "pending-analysis",
  });

  const [headerData, setHeaderData] = useState<PromiseDetailHeaderData | null>(
    null,
  );

  // Sync open state when promiseId changes from parent
  useEffect(() => {
    if (promiseId) {
      setLastPromiseId(promiseId);
      setOpen(true);
      setHeaderData(null);
    } else {
      setOpen(false);
    }
  }, [promiseId]);

  const activePromiseId = lastPromiseId;

  const activeStatus =
    resolvedStatus.promiseId === activePromiseId
      ? resolvedStatus.status
      : (initialStatus ?? "pending-analysis");

  const statusBorderClass = STATUS_CONFIG[activeStatus].borderColor;
  const drawerBorderClass = STATUS_CONFIG[activeStatus].topBorderColor;

  // Called by the close button inside PromiseDetailContent — start dismiss animation
  const handleClose = () => setOpen(false);

  const title = headerData?.title ?? "Löftesdetaljer";

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOpen(false);
        }}
        // vaul fires onClose after the exit animation completes
        onClose={onClose}
      >
        <DrawerContent
          className={`flex flex-col max-h-[75vh] border-t-4 ${drawerBorderClass} bg-card shadow-sm rounded-t-2xl`}
        >
          <DrawerHeader className="flex-none">
            <DrawerTitle className="text-left leading-snug">{title}</DrawerTitle>
            {headerData && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <StatusBadge status={headerData.status} />
                <PartyBadge party={headerData.partyName} />
                <GovernmentBadge governmentStatus={headerData.governmentStatus} />
                {headerData.measurabilityScore !== null && (
                  <MeasurabilityBadge score={headerData.measurabilityScore} />
                )}
              </div>
            )}
          </DrawerHeader>
          {/* Fixed height minus drag handle (mt-4 h-2 = ~1.5rem) so vaul's gesture isn't blocked by overflow:hidden on the outer container */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <PromiseDetailContent
              key={activePromiseId}
              promiseId={activePromiseId!}
              onClose={handleClose}
              onStatusChange={(status) =>
                setResolvedStatus({ promiseId: activePromiseId, status })
              }
              onHeaderDataChange={setHeaderData}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) setOpen(false);
      }}
    >
      <SheetContent
        side="right"
        className={`flex flex-col gap-0 w-full sm:max-w-2xl p-0 border-l-4 ${statusBorderClass} bg-card shadow-sm rounded-l-2xl`}
        // Radix fires onCloseAutoFocus after the exit animation finishes
        onCloseAutoFocus={() => onClose()}
      >
        <SheetHeader className="flex-none p-4">
          <SheetTitle className="text-left leading-snug">{title}</SheetTitle>
          {headerData && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <StatusBadge status={headerData.status} />
              <PartyBadge party={headerData.partyName} />
              <GovernmentBadge governmentStatus={headerData.governmentStatus} />
              {headerData.measurabilityScore !== null && (
                <MeasurabilityBadge score={headerData.measurabilityScore} />
              )}
            </div>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <PromiseDetailContent
            key={activePromiseId}
            promiseId={activePromiseId!}
            onClose={handleClose}
            onStatusChange={(status) =>
              setResolvedStatus({ promiseId: activePromiseId, status })
            }
            onHeaderDataChange={setHeaderData}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
