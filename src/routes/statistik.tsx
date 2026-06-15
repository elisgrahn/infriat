import { createFileRoute } from "@tanstack/react-router";
import Statistics from "@/pages/Statistics";

export const Route = createFileRoute("/statistik")({
  head: () => ({
    meta: [
      { title: "Statistik — Infriat" },
      { name: "description", content: "Statistik och visualiseringar av svenska vallöften." },
    ],
  }),
  component: Statistics,
});
