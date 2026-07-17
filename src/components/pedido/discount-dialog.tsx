import { useEffect, useMemo, useState } from "react";
import { Percent, DollarSign, TrendingUp, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePedidoStore, type PedidoItem } from "@/stores/pedido-store";
import { formatBRL } from "@/lib/format";

type Mode = "perc" | "valor" | "margem" | "acresc";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rascunhoId: string;
  itens: PedidoItem[];
  maxDesc: number;
}

function itemBruto(it: PedidoItem): number {
  return it.quantidade * it.precoUnitario;
}
function itemTotal(it: PedidoItem): number {
  const b = itemBruto(it);
  return Math.max(0, b - b * (it.descontoPerc / 100) + b * (it.acrescimoPerc / 100));
}

export function DiscountDialog({ open, onOpenChange, rascunhoId, itens, maxDesc }: Props) {
  const { updateItem } = usePedidoStore();
  const [mode, setMode] = useState<Mode>("perc");

  const subtotal = useMemo(() => itens.reduce((s, it) => s + itemBruto(it), 0), [itens]);
  const total = useMemo(() => itens.reduce((s, it) => s + itemTotal(it), 0), [itens]);

  // Estados globais (aplicáveis ao pedido inteiro)
  const [globalPerc, setGlobalPerc] = useState<string>("0");
  const [globalVal, setGlobalVal] = useState<string>("0");
  const [globalMargem, setGlobalMargem] = useState<string>("30");
  const [globalAcresc, setGlobalAcresc] = useState<string>("0");
  const [totalManual, setTotalManual] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTotalManual(total.toFixed(2));
    }
  }, [open, total]);

  function applyGlobalPerc() {
    const p = Math.min(Math.max(parseFloat(globalPerc.replace(",", ".")) || 0, 0), 100);
    itens.forEach((it) => updateItem(rascunhoId, it.id, {
      descontoPerc: p,
      descontoValor: (it.precoUnitario * p) / 100,
      acrescimoPerc: 0,
    }));
  }

  function applyGlobalVal() {
    const totalDesc = parseFloat(globalVal.replace(",", ".")) || 0;
    if (subtotal <= 0) return;
    const perc = Math.min((totalDesc / subtotal) * 100, 100);
    itens.forEach((it) => updateItem(rascunhoId, it.id, {
      descontoPerc: perc,
      descontoValor: (it.precoUnitario * perc) / 100,
      acrescimoPerc: 0,
    }));
  }

  function applyGlobalAcresc() {
    const a = Math.max(parseFloat(globalAcresc.replace(",", ".")) || 0, 0);
    itens.forEach((it) => updateItem(rascunhoId, it.id, {
      acrescimoPerc: a,
      descontoPerc: 0,
      descontoValor: 0,
    }));
  }

  function applyGlobalMargem() {
    const m = parseFloat(globalMargem.replace(",", ".")) || 0;
    itens.forEach((it) => {
      const custo = it.precoCusto ?? 0;
      if (custo <= 0) return;
      const novoPreco = Math.round(custo * (1 + m / 100) * 100) / 100;
      updateItem(rascunhoId, it.id, {
        precoUnitario: novoPreco,
        descontoPerc: 0,
        descontoValor: 0,
        acrescimoPerc: 0,
      });
    });
  }

  function applyTotalManual() {
    const alvo = parseFloat(totalManual.replace(",", ".")) || 0;
    if (subtotal <= 0 || alvo <= 0) return;
    if (alvo > subtotal) {
      const perc = ((alvo - subtotal) / subtotal) * 100;
      itens.forEach((it) => updateItem(rascunhoId, it.id, {
        acrescimoPerc: perc,
        descontoPerc: 0,
        descontoValor: 0,
      }));
    } else {
      const perc = Math.min(Math.max(((subtotal - alvo) / subtotal) * 100, 0), 100);
      itens.forEach((it) => updateItem(rascunhoId, it.id, {
        descontoPerc: perc,
        descontoValor: (it.precoUnitario * perc) / 100,
        acrescimoPerc: 0,
      }));
    }
  }

  // Handlers por item
  function setItemPerc(it: PedidoItem, perc: number) {
    updateItem(rascunhoId, it.id, {
      descontoPerc: perc,
      descontoValor: (it.precoUnitario * perc) / 100,
    });
  }
  function setItemFinal(it: PedidoItem, precoFinal: number) {
    if (it.precoUnitario <= 0) return;
    const perc = Math.min(Math.max(((it.precoUnitario - precoFinal) / it.precoUnitario) * 100, 0), 100);
    setItemPerc(it, perc);
  }
  function setItemMargem(it: PedidoItem, m: number) {
    const custo = it.precoCusto ?? 0;
    if (custo <= 0) return;
    const novoPreco = Math.round(custo * (1 + m / 100) * 100) / 100;
    updateItem(rascunhoId, it.id, {
      precoUnitario: novoPreco,
      descontoPerc: 0,
      descontoValor: 0,
    });
  }
  function itemMargemAtual(it: PedidoItem): number {
    const custo = it.precoCusto ?? 0;
    if (custo <= 0) return 0;
    return ((it.precoUnitario - custo) / custo) * 100;
  }
  function itemFinalUnit(it: PedidoItem): number {
    return it.precoUnitario - (it.precoUnitario * it.descontoPerc) / 100;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Descontos e acréscimos</DialogTitle>
          <DialogDescription>
            Ajuste o preço final do pedido por percentual, valor em R$ ou margem sobre o custo. Desconto máximo permitido: {maxDesc}%.
          </DialogDescription>
        </DialogHeader>

        {/* Selector de modo */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ModeButton icon={<Percent className="h-4 w-4" />} label="Desconto %" active={mode === "perc"} onClick={() => setMode("perc")} />
          <ModeButton icon={<DollarSign className="h-4 w-4" />} label="Desconto R$" active={mode === "valor"} onClick={() => setMode("valor")} />
          <ModeButton icon={<Plus className="h-4 w-4" />} label="Acréscimo %" active={mode === "acresc"} onClick={() => setMode("acresc")} />
          <ModeButton icon={<TrendingUp className="h-4 w-4" />} label="Preço por margem" active={mode === "margem"} onClick={() => setMode("margem")} />
        </div>

        {/* Ação global */}
        <div className="rounded-md border bg-muted/30 p-3">
          {mode === "perc" && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Aplicar % de desconto em todos os itens</Label>
                <Input inputMode="decimal" value={globalPerc} onChange={(e) => setGlobalPerc(e.target.value)} />
              </div>
              <Button onClick={applyGlobalPerc}>Aplicar</Button>
            </div>
          )}
          {mode === "valor" && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Desconto total em R$ (distribuído proporcionalmente)</Label>
                <Input inputMode="decimal" value={globalVal} onChange={(e) => setGlobalVal(e.target.value)} />
              </div>
              <Button onClick={applyGlobalVal}>Aplicar</Button>
            </div>
          )}
          {mode === "acresc" && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Aplicar % de acréscimo em todos os itens</Label>
                <Input inputMode="decimal" value={globalAcresc} onChange={(e) => setGlobalAcresc(e.target.value)} />
              </div>
              <Button onClick={applyGlobalAcresc}>Aplicar</Button>
            </div>
          )}
          {mode === "margem" && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Aplicar margem % sobre o custo — Venda = Custo × (1 + Margem%)</Label>
                <Input inputMode="decimal" value={globalMargem} onChange={(e) => setGlobalMargem(e.target.value)} />
              </div>
              <Button onClick={applyGlobalMargem}>Aplicar</Button>
            </div>
          )}
        </div>


        {/* Grid por item */}
        <div className="max-h-[380px] overflow-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-left">Item</th>
                <th className="px-2 py-2 text-right">Qtd</th>
                <th className="px-2 py-2 text-right">Custo</th>
                <th className="px-2 py-2 text-right">Venda</th>
                {mode === "margem" && <th className="px-2 py-2 text-right">Margem %</th>}
                {mode === "acresc" && <th className="px-2 py-2 text-right">Acréscimo %</th>}
                {mode !== "margem" && mode !== "acresc" && <th className="px-2 py-2 text-right">Desc %</th>}
                <th className="px-2 py-2 text-right">Final unit.</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {itens.map((it) => {
                const custo = it.precoCusto ?? 0;
                const margem = itemMargemAtual(it);
                const finalUnit = itemFinalUnit(it);
                return (
                  <tr key={it.id}>
                    <td className="max-w-[220px] truncate px-2 py-1.5" title={it.descricao}>
                      {it.descricao}
                    </td>
                    <td className="px-2 py-1.5 text-right">{it.quantidade}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">{formatBRL(custo)}</td>
                    <td className="px-2 py-1.5 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={it.precoUnitario}
                        onChange={(e) => updateItem(rascunhoId, it.id, { precoUnitario: parseFloat(e.target.value) || 0 })}
                        className="h-7 w-24 text-right"
                      />
                    </td>
                    {mode === "margem" && (
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={Number(margem.toFixed(2))}
                          onChange={(e) => setItemMargem(it, parseFloat(e.target.value) || 0)}
                          disabled={custo <= 0}
                          className="h-7 w-20 text-right"
                        />
                      </td>
                    )}
                    {mode === "acresc" && (
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={Number((it.acrescimoPerc ?? 0).toFixed(2))}
                          onChange={(e) => updateItem(rascunhoId, it.id, {
                            acrescimoPerc: parseFloat(e.target.value) || 0,
                            descontoPerc: 0,
                            descontoValor: 0,
                          })}
                          className="h-7 w-20 text-right"
                        />
                      </td>
                    )}
                    {mode !== "margem" && mode !== "acresc" && (
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={Number(it.descontoPerc.toFixed(2))}
                          onChange={(e) => setItemPerc(it, parseFloat(e.target.value) || 0)}
                          className={`h-7 w-20 text-right ${it.descontoPerc > maxDesc ? "border-destructive text-destructive" : ""}`}
                        />
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={Number(finalUnit.toFixed(2))}
                        onChange={(e) => setItemFinal(it, parseFloat(e.target.value) || 0)}
                        className="h-7 w-24 text-right"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-primary">
                      {formatBRL(itemTotal(it))}
                    </td>
                  </tr>
                );
              })}
              {itens.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    Nenhum item para ajustar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total ajustável */}
        <div className="flex items-end gap-3 rounded-md border bg-primary/5 p-3">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Valor total do pedido (rateia desconto ou acréscimo entre os itens)</Label>
            <Input
              inputMode="decimal"
              value={totalManual}
              onChange={(e) => setTotalManual(e.target.value)}
              className="mt-1 h-10 text-lg font-bold text-primary"
            />
            <div className="mt-1 text-[10px] text-muted-foreground">
              Subtotal {formatBRL(subtotal)} · Atual {formatBRL(total)}
            </div>
          </div>
          <Button onClick={applyTotalManual}>Ajustar total</Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Concluir</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
