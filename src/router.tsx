import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import Index from "@/pages/Index";

// Lazy-load non-critical routes to reduce initial JS bundle
const Statistics = lazy(() => import("@/pages/Statistics"));
const Admin = lazy(() => import("@/pages/Admin"));
const Auth = lazy(() => import("@/pages/Auth"));
const About = lazy(() => import("@/pages/About"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/lofte/:id" element={<Index />} />
        <Route path="/statistik" element={<SuspenseWrapper><Statistics /></SuspenseWrapper>} />
        <Route
          path="/statistik/labb"
          element={<Navigate to="/statistik" replace />}
        />
        <Route path="/admin" element={<SuspenseWrapper><Admin /></SuspenseWrapper>} />
        <Route path="/auth" element={<SuspenseWrapper><Auth /></SuspenseWrapper>} />
        <Route path="/om" element={<SuspenseWrapper><About /></SuspenseWrapper>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<SuspenseWrapper><NotFound /></SuspenseWrapper>} />
      </Route>
    </Routes>
  );
}
