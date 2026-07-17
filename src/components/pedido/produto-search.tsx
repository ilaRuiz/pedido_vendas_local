import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useEstoque,
  normalize,
  matchNormalizedTokens,
  produtoBusca,
  produtoId,
} from "@/lib/api-hooks";
import { ProdutoCard } from "./produto-card";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (produto: any) => void;
}

export function ProdutoSearch({ open, onOpenChange, onSelect }: Props) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const estoqueQ = useEstoque();

  const indexed = useMemo(() => {
    const list = estoqueQ.data ?? [];
    return list.map((p) => ({ item: p, search: normalize(produtoBusca(p)) }));
  }, [estoqueQ.data]);

  const filtered = useMemo(() => {
    const term = deferredQ.trim();
    if (!term) return indexed.slice(0, 80).map(({ item }) => item);
    return indexed
      .filter(({ search }) => matchNormalizedTokens(search, term))
      .slice(0, 200)
      .map(({ item }) => item);
  }, [deferredQ, indexed]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Buscar produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
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
          <div className="text-xs text-muted-foreground">
            {estoqueQ.data
              ? `${filtered.length} de ${estoqueQ.data.length} produto(s)`
              : "Carregando..."}
          </div>
          <div className="max-h-[560px] overflow-auto rounded-md border">
            {estoqueQ.isLoading && (
              <div className="p-4 text-sm text-muted-foreground">Carregando estoque...</div>
            )}
            {estoqueQ.error && (
              <div className="p-4 text-sm text-destructive">
                Erro: {(estoqueQ.error as Error).message}
              </div>
            )}
            {filtered.length === 0 && !estoqueQ.isLoading && (
              <div className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado.</div>
            )}
            <ul className="divide-y">
              {filtered.map((p) => (
                <li key={produtoId(p)}>
                  <ProdutoCard
                    produto={p}
                    onClick={() => {
                      onSelect(p);
                      onOpenChange(false);
                      setQ("");
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
