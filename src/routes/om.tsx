import { createFileRoute } from "@tanstack/react-router";
import About from "@/pages/About";

export const Route = createFileRoute("/om")({
  head: () => ({
    meta: [
      { title: "Om Infriat" },
      { name: "description", content: "Om Infriat — projektets syfte och metod." },
    ],
  }),
  component: About,
});
