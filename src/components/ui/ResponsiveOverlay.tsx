import * as React from "react";
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
import { useResponsive } from "@/hooks/use-responsive";
import { cn } from "@/lib/utils";

type ClassVariantProps = {
  className?: string;
  mobileClassName?: string;
  desktopClassName?: string;
};

type ResponsiveOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseComplete?: () => void;
  children: React.ReactNode;
};

const ResponsiveOverlayModeContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

function useResponsiveOverlayMode() {
  return React.useContext(ResponsiveOverlayModeContext);
}

function resolveClasses(isMobile: boolean, props: ClassVariantProps) {
  return cn(
    props.className,
    isMobile ? props.mobileClassName : props.desktopClassName,
  );
}

export function ResponsiveOverlay({
  open,
  onOpenChange,
  onCloseComplete,
  children,
}: ResponsiveOverlayProps) {
  const responsive = useResponsive();
  const isMobile = responsive?.isMobile ?? false;

  // Track the committed mode so we can detect switches
  const [committedMode, setCommittedMode] = React.useState(isMobile);
  // During a mode switch, suppress close callbacks from the unmounting component
  const suppressCloseRef = React.useRef(false);

  const onCloseCompleteRef = React.useRef(onCloseComplete);
  onCloseCompleteRef.current = onCloseComplete;
  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // When isMobile changes, suppress the unmount-triggered close and switch mode
  React.useEffect(() => {
    if (isMobile !== committedMode) {
      if (open) {
        suppressCloseRef.current = true;
      }
      setCommittedMode(isMobile);
    }
  }, [isMobile, committedMode, open]);

  // Clear suppression after the new component has mounted
  React.useEffect(() => {
    if (suppressCloseRef.current) {
      const id = requestAnimationFrame(() => {
        suppressCloseRef.current = false;
      });
      return () => cancelAnimationFrame(id);
    }
  }, [committedMode]);

  const guardedOnOpenChange = React.useCallback((isOpen: boolean) => {
    if (!isOpen && suppressCloseRef.current) return;
    onOpenChangeRef.current(isOpen);
  }, []);

  const guardedOnCloseComplete = React.useCallback(() => {
    if (suppressCloseRef.current) return;
    onCloseCompleteRef.current?.();
  }, []);

  // For the Sheet path: detect close transition and fire callback after animation.
  // onCloseAutoFocus is unreliable when there is no trigger element.
  const prevOpenRef = React.useRef(open);
  React.useEffect(() => {
    if (prevOpenRef.current && !open && !committedMode) {
      // Sheet close animation is 300ms (data-[state=closed]:duration-300)
      const timer = setTimeout(() => {
        if (!suppressCloseRef.current) {
          onCloseCompleteRef.current?.();
        }
      }, 310);
      prevOpenRef.current = open;
      return () => clearTimeout(timer);
    }
    prevOpenRef.current = open;
  }, [open, committedMode]);

  if (committedMode) {
    return (
      <ResponsiveOverlayModeContext.Provider value={{ isMobile: true }}>
        <Drawer
          open={open}
          onOpenChange={guardedOnOpenChange}
          onClose={guardedOnCloseComplete}
          shouldScaleBackground={false}
        >
          {children}
        </Drawer>
      </ResponsiveOverlayModeContext.Provider>
    );
  }

  return (
    <ResponsiveOverlayModeContext.Provider value={{ isMobile: false }}>
      <Sheet
        open={open}
        onOpenChange={guardedOnOpenChange}
      >
        {children}
      </Sheet>
    </ResponsiveOverlayModeContext.Provider>
  );
}

type ResponsiveOverlayContentProps = ClassVariantProps & {
  children: React.ReactNode;
  side?: "left" | "right";
  onCloseComplete?: () => void;
};

export function ResponsiveOverlayContent({
  className,
  mobileClassName,
  desktopClassName,
  children,
  side = "right",
  onCloseComplete,
}: ResponsiveOverlayContentProps) {
  const { isMobile } = useResponsiveOverlayMode();
  const resolvedClassName = resolveClasses(isMobile, {
    className,
    mobileClassName,
    desktopClassName,
  });

  if (isMobile) {
    return <DrawerContent className={resolvedClassName}>{children}</DrawerContent>;
  }

  return (
    <SheetContent
      side={side}
      className={resolvedClassName}
    >
      {children}
    </SheetContent>
  );
}

type ResponsiveOverlayHeaderProps = ClassVariantProps & {
  children: React.ReactNode;
};

export function ResponsiveOverlayHeader({
  className,
  mobileClassName,
  desktopClassName,
  children,
}: ResponsiveOverlayHeaderProps) {
  const { isMobile } = useResponsiveOverlayMode();
  const resolvedClassName = resolveClasses(isMobile, {
    className,
    mobileClassName,
    desktopClassName,
  });

  if (isMobile) {
    return <DrawerHeader className={resolvedClassName}>{children}</DrawerHeader>;
  }

  return <SheetHeader className={resolvedClassName}>{children}</SheetHeader>;
}

type ResponsiveOverlayTitleProps = ClassVariantProps & {
  children: React.ReactNode;
};

export function ResponsiveOverlayTitle({
  className,
  mobileClassName,
  desktopClassName,
  children,
}: ResponsiveOverlayTitleProps) {
  const { isMobile } = useResponsiveOverlayMode();
  const resolvedClassName = resolveClasses(isMobile, {
    className,
    mobileClassName,
    desktopClassName,
  });

  if (isMobile) {
    return <DrawerTitle className={resolvedClassName}>{children}</DrawerTitle>;
  }

  return <SheetTitle className={resolvedClassName}>{children}</SheetTitle>;
}

type ResponsiveOverlayHeaderExtrasProps = ClassVariantProps & {
  children: React.ReactNode;
};

export function ResponsiveOverlayHeaderExtras({
  className,
  mobileClassName,
  desktopClassName,
  children,
}: ResponsiveOverlayHeaderExtrasProps) {
  const { isMobile } = useResponsiveOverlayMode();
  const resolvedClassName = resolveClasses(isMobile, {
    className: cn(
      "w-full overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]",
      className,
    ),
    mobileClassName,
    desktopClassName,
  });

  if (isMobile) {
    return (
      <div
        data-vaul-no-drag
        className={resolvedClassName}
        onPointerDownCapture={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    );
  }

  return <div className={resolvedClassName}>{children}</div>;
}

type ResponsiveOverlayBodyProps = ClassVariantProps & {
  children: React.ReactNode;
};

export function ResponsiveOverlayBody({
  className,
  mobileClassName,
  desktopClassName,
  children,
}: ResponsiveOverlayBodyProps) {
  const { isMobile } = useResponsiveOverlayMode();
  const resolvedClassName = resolveClasses(isMobile, {
    className,
    mobileClassName,
    desktopClassName,
  });

  return <div className={resolvedClassName}>{children}</div>;
}
