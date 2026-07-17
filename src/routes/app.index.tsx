import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ListOrdered, Search, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

export const Route = createFileRoute("/app/")({
  component: Home,
});

const tiles = [
  { to: "/app/pedidos/novo", icon: FileText, title: "Novo pedido", desc: "Lance um novo pedido de venda." },
  { to: "/app/pedidos", icon: ListOrdered, title: "Pedidos", desc: "Consulte pedidos gravados." },
  { to: "/app/consulta", icon: Search, title: "Consulta preço", desc: "Pesquisa rápida de produtos." },
];

function Home() {
  const session = useAuthStore((s) => s.session);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {session?.nome}</h1>
        <p className="text-sm text-muted-foreground">O que vamos fazer agora?</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="h-full transition-all hover:border-primary hover:shadow-elegant">
              <CardHeader>
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <t.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {session?.isAdmin && (
          <Link to="/app/config">
            <Card className="h-full transition-all hover:border-primary hover:shadow-elegant">
              <CardHeader>
                <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Settings className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">Configurações</CardTitle>
                <CardDescription>API, empresa, logs.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
