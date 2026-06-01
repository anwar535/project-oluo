import { createFileRoute, redirect } from "@tanstack/react-router";

// Projects index removed — homepage is the single entry point for browsing
// projects. Any old links to /projects now redirect to the home page.
export const Route = createFileRoute("/projects")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
