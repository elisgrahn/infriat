import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { FilterProvider } from "@/store/FilterContext";
import { ResponsiveProvider } from "@/store/ResponsiveContext";
import { AppRoutes } from "@/router";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="infriat-theme">
      <ResponsiveProvider>
        <TooltipProvider>
          <BrowserRouter>
            <FilterProvider>
              <Sonner />
              <AppRoutes />
            </FilterProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ResponsiveProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
