import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { FileText, ListOrdered, Search, Settings, Home, User, LogOut, Moon, Sun, PanelLeft } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
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

const items = [
  { title: "Início", url: "/app", icon: Home, admin: false },
  { title: "Novo pedido", url: "/app/pedidos/novo", icon: FileText, admin: false },
  { title: "Consulta Pedidos", url: "/app/pedidos", icon: ListOrdered, admin: false },
  { title: "Consulta preço", url: "/app/consulta", icon: Search, admin: false },
  { title: "Configurações", url: "/app/config", icon: Settings, admin: true },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isAdmin = useAuthStore((s) => s.session?.isAdmin ?? false);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-1">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight text-muted-foreground">
              Menu
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleSidebar}
            aria-label="Alternar menu"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="sr-only">Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {(() => {
                const visible = items.filter((it) => !it.admin || isAdmin);
                // Longest-prefix match: pick the single item that best matches pathname
                let bestUrl = "";
                for (const it of visible) {
                  if (pathname === it.url || pathname.startsWith(it.url + "/")) {
                    if (it.url.length > bestUrl.length) bestUrl = it.url;
                  }
                }
                return visible.map((it) => {
                  const active = it.url === bestUrl;
                  return (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={it.title}>
                        <Link to={it.url} className="flex items-center gap-3">
                          <it.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{it.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                });
              })()}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size={collapsed ? "icon" : "default"}
              className={
                collapsed
                  ? "mx-auto h-9 w-9 shrink-0"
                  : "w-full justify-start gap-2"
              }
              aria-label={session?.nome ?? "Operador"}
            >
              <User className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="truncate text-sm">
                  {session?.nome ?? session?.codigo ?? "Operador"}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
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
        {!collapsed && (
          <div className="px-1 pt-1 text-[10px] text-muted-foreground">
            Delta Sistemas V 1.0
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
