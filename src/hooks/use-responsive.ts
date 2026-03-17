import * as React from "react";
import { ResponsiveContext } from "@/contexts/responsive-context";

export function useResponsive() {
  return React.useContext(ResponsiveContext);
}
