import * as React from "react";
import { ResponsiveContext } from "@/store/responsive-context";

export function useResponsive() {
  return React.useContext(ResponsiveContext);
}
