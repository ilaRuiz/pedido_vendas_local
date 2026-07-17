import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import { Search, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useEstoque,
  normalize,
  matchNormalizedTokens,
  produtoBusca,
  produtoId,
  produtoNome,
  produtoPreco,
  pick,
} from "@/lib/api-hooks";
import { ProdutoCard } from "@/components/pedido/produto-card";
import { usePedidoStore } from "@/stores/pedido-store";
import { createId } from "@/lib/utils";

export const Route = createFileRoute("/app/consulta")({
  component: ConsultaPage,
});

function ConsultaPage() {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const estoqueQ = useEstoque();
  const navigate = useNavigate();
  const { novoRascunho, addItem } = usePedidoStore();

  const indexed = useMemo(() => {
    const list = estoqueQ.data ?? [];
    return list.map((p) => ({ item: p, search: normalize(produtoBusca(p)) }));
  }, [estoqueQ.data]);

  const filtered = useMemo(() => {
    const term = deferredQ.trim();
    if (!term) return [];
    return indexed
      .filter(({ search }) => matchNormalizedTokens(search, term))
      .slice(0, 100)
      .map(({ item }) => item);
  }, [deferredQ, indexed]);

  function abrirPedidoCom(p: any) {
    const id = novoRascunho();
    addItem(id, {
      id: createId(),
      produtoId: produtoId(p),
      descricao: produtoNome(p),
      marca: String(pick(p, "MARCA", "marca") ?? ""),
      grupo: String(pick(p, "GRUPO", "grupo") ?? ""),
      unidade: String(pick(p, "UNIDADE", "unidade", "UN", "un") ?? "UN"),
      quantidade: 1,
      precoUnitario: produtoPreco(p),
      descontoPerc: 0,
      acrescimoPerc: 0,
    });
    navigate({ to: "/app/pedidos/novo" });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Consulta rápida de preço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Nome, marca, grupo, código, ref. fábrica, ref. paralela, cód. barras..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          {q.trim() && (
            <div className="mt-2 text-xs text-muted-foreground">
              {estoqueQ.data
                ? `${filtered.length} produto(s) encontrado(s)`
                : "Carregando..."}
            </div>
          )}
        </CardContent>
      </Card>

      {q.trim() && (
        <Card>
          <CardContent className="p-0">
            {estoqueQ.isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Carregando estoque...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Nenhum produto encontrado.</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((p) => (
                  <li key={produtoId(p)}>
                    <ProdutoCard
                      produto={p}
                      actionSlot={
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 gap-1"
                          onClick={() => abrirPedidoCom(p)}
                        >
                          <PlusCircle className="h-4 w-4" /> Novo pedido
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
