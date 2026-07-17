import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: () => {
    // Redirect based on client-side auth (localStorage-hydrated)
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("delta.auth");
      const parsed = raw ? JSON.parse(raw) : null;
      const session = parsed?.state?.session;
      if (session?.codigo) throw redirect({ to: "/app" });
      throw redirect({ to: "/login" });
    } catch (e) {
      if ((e as any)?.isRedirect) throw e;
      throw redirect({ to: "/login" });
    }
  },
  component: () => null,
});
