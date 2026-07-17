import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  useEstoque,
  produtoBusca,
  produtoNome,
  produtoId,
  produtoPreco,
  produtoEstoque,
  produtoUnidade,
  produtoGrupo,
  normalize,
  matchNormalizedTokens,
  pick,
} from "@/lib/api-hooks";
import { formatBRL } from "@/lib/format";

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (produto: any) => void;
  onEnter?: () => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ProdutoAutocomplete({ value, onChangeText, onSelect, onEnter, disabled, placeholder, inputRef }: Props) {
  const estoqueQ = useEstoque();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(value);
  const deferredTerm = useDeferredValue(term);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => setTerm(value), [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const indexed = useMemo(() => {
    const list = estoqueQ.data ?? [];
    return list.map((p) => ({ item: p, search: normalize(produtoBusca(p)) }));
  }, [estoqueQ.data]);

  const results = useMemo(() => {
    const q = deferredTerm.trim();
    if (!q) return [];
    return indexed
      .filter(({ search }) => matchNormalizedTokens(search, q))
      .slice(0, 30)
      .map(({ item }) => item);
  }, [deferredTerm, indexed]);

  useEffect(() => {
    setHighlight(0);
  }, [term]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  return (
    <div ref={wrapRef} className="relative">
      <Input
        ref={inputRef}
        value={term}
        disabled={disabled}
        placeholder={placeholder ?? "Descrição, marca, código, ref..."}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const v = e.target.value;
          setTerm(v);
          onChangeText(v);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, results.length - 1));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
            return;
          }
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (e.key !== "Enter") return;
          e.preventDefault();
          if (open && results.length > 0) {
            const idx = Math.min(highlight, results.length - 1);
            onSelect(results[idx]);
            setOpen(false);
          }
          onEnter?.();
        }}
      />
      {open && !disabled && term.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-auto rounded-md border bg-popover shadow-md">
          {estoqueQ.isLoading && (
            <div className="p-2 text-xs text-muted-foreground">Carregando...</div>
          )}
          {!estoqueQ.isLoading && results.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">Nenhum resultado.</div>
          )}
          <ul ref={listRef} className="divide-y">
            {results.map((p, idx) => (
              <li key={produtoId(p)}>
                <button
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                    onEnter?.();
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${idx === highlight ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{produtoNome(p)}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {String(pick(p, "MARCA", "marca") ?? "")} · {produtoGrupo(p)} · {produtoUnidade(p)} · Est: {produtoEstoque(p)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <div className="font-semibold text-primary">{formatBRL(produtoPreco(p))}</div>
                    <div className="text-muted-foreground">{produtoId(p)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
