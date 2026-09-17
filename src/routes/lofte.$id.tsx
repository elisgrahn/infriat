import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lofte/$id")({
  staticData: { sitemap: false },
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/",
      search: { promise: params.id } as never,
      replace: true,
    });
  },
});
