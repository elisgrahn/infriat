import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { FilterProvider } from "@/contexts/FilterContext";
import { StickyBarProvider } from "@/contexts/StickyBarContext";
import { ResponsiveProvider } from "@/contexts/ResponsiveContext";
import { Navbar } from "@/components/Navbar";
import Index from "./pages/Index";
import Statistics from "./pages/Statistics";
import StatisticsLab from "./pages/StatisticsLab";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
...
                  <Route path="/" element={<Index />} />
                  <Route path="/lofte/:id" element={<Index />} />
                  <Route path="/statistik" element={<Statistics />} />
                  <Route path="/statistik/labb" element={<StatisticsLab />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/auth" element={<Auth />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </FilterProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ResponsiveProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
