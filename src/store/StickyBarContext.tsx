import { createContext, useContext, useState } from "react";

interface StickyBarContextValue {
  isMobileBarStuck: boolean;
  setMobileBarStuck: (stuck: boolean) => void;
}

const StickyBarContext = createContext<StickyBarContextValue>({
  isMobileBarStuck: false,
  setMobileBarStuck: () => {},
});

export function StickyBarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileBarStuck, setMobileBarStuck] = useState(false);
  return (
    <StickyBarContext.Provider value={{ isMobileBarStuck, setMobileBarStuck }}>
      {children}
    </StickyBarContext.Provider>
  );
}

export function useStickyBar() {
  return useContext(StickyBarContext);
}
