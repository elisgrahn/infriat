import * as React from "react";
import { useResponsive } from "@/hooks/use-responsive";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const responsive = useResponsive();
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (responsive) return;

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      setIsMobile(mql.matches);
    };

    onChange();

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else {
      mql.addListener(onChange);
    }

    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange);
      } else {
        mql.removeListener(onChange);
      }
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [responsive]);

  if (responsive) return responsive.isMobile;
  return !!isMobile;
}
