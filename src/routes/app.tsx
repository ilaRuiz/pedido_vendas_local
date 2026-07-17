import { createFileRoute, Outlet, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("delta.auth");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.state?.session?.codigo) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function MobileBackButton() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  if (!isMobile) return null;
  // Não mostra em telas raiz do app
  if (pathname === "/app" || pathname === "/app/") return null;
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label="Voltar"
      onClick={() => {
        if (window.history.length > 1) router.history.back();
        else router.navigate({ to: "/app" });
      }}
      className="fixed left-3 top-3 z-50 h-9 w-9 rounded-full border shadow-md md:hidden"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}

function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <MobileBackButton />
        <main className="min-w-0 flex-1 overflow-auto p-3 pt-14 md:p-4 md:pt-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
