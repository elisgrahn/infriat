import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import Index from "@/pages/Index";
import Statistics from "@/pages/Statistics";
import Admin from "@/pages/Admin";
import Auth from "@/pages/Auth";
import About from "@/pages/About";
import NotFound from "@/pages/NotFound";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/lofte/:id" element={<Index />} />
        <Route path="/statistik" element={<Statistics />} />
        <Route
          path="/statistik/labb"
          element={<Navigate to="/statistik" replace />}
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/om" element={<About />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
