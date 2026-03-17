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

  if (isMobile) {
    return (
      <ResponsiveOverlayModeContext.Provider value={{ isMobile }}>
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          onClose={onCloseComplete}
        >
          {children}
        </Drawer>
      </ResponsiveOverlayModeContext.Provider>
    );
  }

  return (
    <ResponsiveOverlayModeContext.Provider value={{ isMobile }}>
      <Sheet
        open={open}
        onOpenChange={onOpenChange}
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
      onCloseAutoFocus={onCloseComplete}
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
