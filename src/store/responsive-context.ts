import * as React from "react";

export type ResponsiveContextValue = {
  isMobile: boolean;
};

export const ResponsiveContext = React.createContext<ResponsiveContextValue | undefined>(undefined);
