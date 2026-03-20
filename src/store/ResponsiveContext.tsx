import * as React from "react";
import { useMediaQuery } from "usehooks-ts";
import { ResponsiveContext } from "@/store/responsive-context";

const MOBILE_BREAKPOINT = 768;

export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`, {
    defaultValue: false,
    initializeWithValue: false,
  });

  const value = React.useMemo(() => ({ isMobile }), [isMobile]);
  return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}
