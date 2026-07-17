import { useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth-store";
import { useThemeStore } from "@/stores/theme-store";
import { useCompanyStore } from "@/stores/company-store";
import deltaLogo from "@/assets/delta-logo.png";

export function Topbar() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle } = useThemeStore();
  const companyName = useCompanyStore((s) => s.companyName);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card px-3 shadow-sm">
      <SidebarTrigger className="shrink-0" />
      <div className="flex min-w-0 items-center gap-2">
        <img
          src={deltaLogo}
          alt="Delta"
          width={32}
          height={32}
          className="h-8 w-8 shrink-0"
        />
        <span className="hidden text-sm font-semibold tracking-tight text-primary sm:inline">
          Delta
        </span>
        <span className="mx-2 hidden h-5 w-px bg-border sm:inline-block" />
        <span className="truncate text-sm font-medium text-foreground sm:text-base">
          {companyName}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden max-w-[160px] truncate sm:inline">
                {session?.nome ?? session?.codigo ?? "Operador"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-semibold">{session?.nome}</div>
              <div className="text-xs text-muted-foreground">
                Cód: {session?.codigo}
                {session?.isAdmin ? " · ADM" : ""}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={toggle}>
              {theme === "dark" ? (
                <>
                  <Sun className="mr-2 h-4 w-4" /> Tema claro
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" /> Tema escuro
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
