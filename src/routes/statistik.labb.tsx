import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/statistik/labb")({
  beforeLoad: () => {
    throw redirect({ to: "/statistik" });
  },
});
