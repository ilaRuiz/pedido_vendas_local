import { useDeferredValue, useMemo, useState } from "react";
import { Search, MapPin, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useParceiros,
  useParceirosPropriedade,
  parceiroBusca,
  parceiroId,
  parceiroNome,
  pick,
  normalize,
  matchNormalizedTokens,
} from "@/lib/api-hooks";

export interface ClienteSelecionado {
  cliente: any;
  propriedade?: any;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelect: (sel: ClienteSelecionado) => void;
}

export function ClienteSearch({ open, onOpenChange, onSelect }: Props) {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [chosen, setChosen] = useState<any | null>(null);
  const parceirosQ = useParceiros();
  const propsQ = useParceirosPropriedade();

  const indexed = useMemo(() => {
    const list = parceirosQ.data ?? [];
    return list.map((p) => ({ item: p, search: normalize(parceiroBusca(p)) }));
  }, [parceirosQ.data]);

  const filtered = useMemo(() => {
    const term = deferredQ.trim();
    if (!term) return indexed.slice(0, 50).map(({ item }) => item);
    return indexed
      .filter(({ search }) => matchNormalizedTokens(search, term))
      .slice(0, 100)
      .map(({ item }) => item);
  }, [deferredQ, indexed]);

  const propriedadesDoCliente = useMemo(() => {
    if (!chosen) return [];
    const id = parceiroId(chosen);
    return (propsQ.data ?? []).filter(
      (pr) =>
        String(pick(pr, "PARCEIRO", "ID_PARCEIRO", "id_parceiro", "parceiro") ?? "") === id,
    );
  }, [chosen, propsQ.data]);

  function pickCliente(cliente: any) {
    const id = parceiroId(cliente);
    const props = (propsQ.data ?? []).filter(
      (pr) =>
        String(pick(pr, "PARCEIRO", "ID_PARCEIRO", "id_parceiro", "parceiro") ?? "") === id,
    );
    if (props.length > 1) {
      setChosen(cliente);
    } else {
      onSelect({ cliente, propriedade: props[0] });
      reset();
    }
  }

  function reset() {
    setQ("");
    setChosen(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : reset())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {chosen ? "Selecione a propriedade" : "Buscar cliente"}
          </DialogTitle>
        </DialogHeader>

        {!chosen ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Nome, razão, telefone, endereço, CPF/CNPJ..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[400px] overflow-auto rounded-md border">
              {parceirosQ.isLoading && (
                <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
              )}
              {parceirosQ.error && (
                <div className="p-4 text-sm text-destructive">
                  Erro: {(parceirosQ.error as Error).message}
                </div>
              )}
              {filtered.length === 0 && !parceirosQ.isLoading && (
                <div className="p-4 text-sm text-muted-foreground">Nenhum resultado.</div>
              )}
              <ul className="divide-y">
                {filtered.map((p) => (
                  <li key={parceiroId(p)}>
                    <button
                      onClick={() => pickCliente(p)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{parceiroNome(p)}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {String(pick(p, "MUNICIPIO", "municipio", "CIDADE", "cidade") ?? "")}
                          {(pick(p, "MUNICIPIO") || pick(p, "CIDADE")) && (pick(p, "TELEFONE") || pick(p, "CELULAR")) ? " · " : ""}
                          {String(pick(p, "TELEFONE", "telefone", "CELULAR", "celular") ?? "")}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium">{parceiroNome(chosen)}</div>
              <div className="text-xs text-muted-foreground">
                Selecione uma das propriedades:
              </div>
            </div>
            <ul className="max-h-[400px] divide-y overflow-auto rounded-md border">
              {propriedadesDoCliente.map((pr, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => {
                      onSelect({ cliente: chosen, propriedade: pr });
                      reset();
                    }}
                    className="flex w-full items-start gap-3 p-3 text-left hover:bg-accent"
                  >
                    <MapPin className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {String(
                          pick(pr, "NOME_PROPRIEDADE", "PROPRIEDADE", "propriedade", "DESCRICAO", "ENDERECO", "endereco") ?? "Propriedade",
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {String(pick(pr, "ENDERECO", "endereco", "LOGRADOURO") ?? "")}
                        {pick(pr, "NUMERO") ? `, ${String(pick(pr, "NUMERO"))}` : ""}
                        {" · "}
                        {String(pick(pr, "MUNICIPIO", "municipio", "CIDADE", "cidade") ?? "")}
                        {pick(pr, "ESTADO", "UF") ? `/${String(pick(pr, "ESTADO", "UF"))}` : ""}
                      </div>
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        #{String(pick(pr, "SEQ", "ID", "id") ?? idx + 1)}
                      </Badge>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" onClick={() => setChosen(null)}>
              ← Escolher outro cliente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
