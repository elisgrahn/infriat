import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for /parti/* — the page content lives in parti.index.tsx
// (overview) and parti.$kort.tsx (party detail).
export const Route = createFileRoute("/parti")({
  staticData: { sitemap: false },
  component: () => <Outlet />,
});
