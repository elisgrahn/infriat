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
import { PromiseDetailContent } from "@/components/PromiseDetailContent";
import { STATUS_CONFIG, type PromiseStatus } from "@/config/statusConfig";

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

  // Sync open state when promiseId changes from parent
  useEffect(() => {
    if (promiseId) {
      setLastPromiseId(promiseId);
      setOpen(true);
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
          className={`h-[75vh] max-h-[75vh] !border-t-4 ${drawerBorderClass} bg-card shadow-sm rounded-t-3xl`}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Löftesdetaljer</DrawerTitle>
          </DrawerHeader>
          {/* Fixed height minus drag handle (mt-4 h-2 = ~1.5rem) so vaul's gesture isn't blocked by overflow:hidden on the outer container */}
          <div className="overflow-y-auto px-4 pb-6" style={{ height: "calc(75vh - 1.5rem)" }}>
            <PromiseDetailContent
              key={activePromiseId}
              promiseId={activePromiseId!}
              onClose={handleClose}
              onStatusChange={(status) =>
                setResolvedStatus({ promiseId: activePromiseId, status })
              }
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
        className={`w-full sm:max-w-2xl p-0 border-l-4 ${statusBorderClass} bg-card shadow-sm rounded-l-3xl`}
        // Radix fires onCloseAutoFocus after the exit animation finishes
        onCloseAutoFocus={() => onClose()}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Löftesdetaljer</SheetTitle>
        </SheetHeader>
        <div className="h-full overflow-y-auto p-4 sm:p-6">
          <PromiseDetailContent
            key={activePromiseId}
            promiseId={activePromiseId!}
            onClose={handleClose}
            onStatusChange={(status) =>
              setResolvedStatus({ promiseId: activePromiseId, status })
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
