import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/lofte/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/",
      search: { promise: params.id } as never,
      replace: true,
    });
  },
});
