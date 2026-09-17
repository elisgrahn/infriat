import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/statistik/labb")({
  staticData: { sitemap: false },
  beforeLoad: () => {
    throw redirect({ to: "/statistik" });
  },
});
