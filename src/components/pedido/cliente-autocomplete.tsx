import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  useParceiros,
  parceiroBusca,
  parceiroId,
  parceiroNome,
  pick,
  normalize,
  matchNormalizedTokens,
} from "@/lib/api-hooks";

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (parceiro: any) => void;
  onEnter?: () => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ClienteAutocomplete({ value, onChangeText, onSelect, onEnter, placeholder, inputRef }: Props) {
  const parceirosQ = useParceiros();
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
    const list = parceirosQ.data ?? [];
    return list.map((p) => ({ item: p, search: normalize(parceiroBusca(p)) }));
  }, [parceirosQ.data]);

  const results = useMemo(() => {
    const q = deferredTerm.trim();
    if (!q) return indexed.slice(0, 20).map(({ item }) => item);
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
        placeholder={placeholder ?? "Digite nome, CPF/CNPJ, telefone..."}
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
          const list = results;
          if (open && list.length > 0) {
            const idx = Math.min(highlight, list.length - 1);
            onSelect(list[idx]);
            setOpen(false);
          }
          onEnter?.();
        }}
      />
      {open && term.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-md border bg-popover shadow-md">
          {parceirosQ.isLoading && (
            <div className="p-2 text-xs text-muted-foreground">Carregando...</div>
          )}
          {!parceirosQ.isLoading && results.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">Nenhum resultado.</div>
          )}
          <ul ref={listRef} className="divide-y">
            {results.map((p, idx) => (
              <li key={parceiroId(p)}>
                <button
                  type="button"
                  data-idx={idx}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                    onEnter?.();
                  }}
                  className={`w-full px-3 py-2 text-left text-sm ${idx === highlight ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <div className="truncate font-medium">{parceiroNome(p)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {String(pick(p, "CPF", "cpf", "CNPJ", "cnpj", "DOCUMENTO") ?? "")}
                    {" · "}
                    {String(pick(p, "MUNICIPIO", "municipio", "CIDADE", "cidade") ?? "")}
                    {" · "}
                    {String(pick(p, "TELEFONE", "telefone", "CELULAR", "celular") ?? "")}
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

export function isClienteDiversos(parceiro: any): boolean {
  const nome = parceiroNome(parceiro).toLowerCase();
  return nome.includes("diverso") || nome.includes("consumidor");
}
