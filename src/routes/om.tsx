import { createFileRoute } from "@tanstack/react-router";
import About from "@/pages/About";

export const Route = createFileRoute("/om")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Om Infriat – metod och källor" },
      {
        name: "description",
        content:
          "Om Infriat — hur vi granskar svenska partiers vallöften med AI-analys, öppna källor och communityn.",
      },
      { property: "og:title", content: "Om Infriat – metod och källor" },
      {
        property: "og:description",
        content:
          "Hur vi granskar svenska partiers vallöften med AI-analys, öppna källor och communityn.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://infriat.se/om" },
      { property: "og:image", content: "https://infriat.se/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Om Infriat – metod och källor" },
      {
        name: "twitter:description",
        content:
          "Hur vi granskar svenska partiers vallöften med AI-analys, öppna källor och communityn.",
      },
      { name: "twitter:image", content: "https://infriat.se/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://infriat.se/om" }],
  }),
  component: About,
});
