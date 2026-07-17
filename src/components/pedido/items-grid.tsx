import { useEffect, useMemo, useRef, useState } from "react";
import { Columns3, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePedidoStore, type PedidoItem } from "@/stores/pedido-store";
import { formatBRL } from "@/lib/format";
import { pick } from "@/lib/api-hooks";

type ColKind = "text" | "num" | "money" | "editQtd" | "editPreco" | "editDescPerc" | "editDescVal" | "editAcresc" | "total" | "action";

interface ColDef {
  id: string;
  label: string;
  kind: ColKind;
  width: number;
  visible: boolean;
  align?: "left" | "right" | "center";
  get?: (it: PedidoItem, idx: number) => any;
}

// Colunas padrão inspiradas no ERP legado (imagem de referência).
const DEFAULT_COLS: ColDef[] = [
  { id: "handle", label: "", kind: "action", width: 60, visible: true, align: "center" },
  { id: "item", label: "ITEM", kind: "num", width: 52, visible: true, align: "right",
    get: (_it, idx) => idx + 1 },
  { id: "cod", label: "COD", kind: "text", width: 76, visible: true, align: "left",
    get: (it) => it.produtoId || "—" },
  { id: "descricao", label: "DESCRIÇÃO", kind: "text", width: 240, visible: true, align: "left",
    get: (it) => it.descricao },
  { id: "marca", label: "MARCA", kind: "text", width: 100, visible: true, align: "left",
    get: (it) => it.marca ?? "" },
  { id: "grupo", label: "GRUPO", kind: "text", width: 120, visible: false, align: "left",
    get: (it) => it.grupo ?? "" },
  { id: "qtd", label: "QTD", kind: "editQtd", width: 72, visible: true, align: "right" },
  { id: "estoque", label: "ESTOQUE", kind: "num", width: 80, visible: false, align: "right",
    get: (it) => it.estoqueDisponivel ?? "" },
  { id: "custo", label: "VLR CUSTO", kind: "money", width: 92, visible: false, align: "right",
    get: (it) => it.precoCusto ?? 0 },
  { id: "venda", label: "VLR VENDA", kind: "editPreco", width: 100, visible: true, align: "right" },
  { id: "descVal", label: "DESCONTO", kind: "editDescVal", width: 96, visible: true, align: "right" },
  { id: "descPerc", label: "% DESC", kind: "editDescPerc", width: 74, visible: false, align: "right" },
  { id: "acresc", label: "% ACRÉSC", kind: "editAcresc", width: 86, visible: false, align: "right" },
  { id: "refPar", label: "REF PARALELA", kind: "text", width: 120, visible: false, align: "left",
    get: (it) => String(pick(it.raw ?? {}, "REF_PARALELA", "REFPARALELA", "REF_PAR") ?? "") },
  { id: "refFab", label: "REF FÁBRICA", kind: "text", width: 120, visible: false, align: "left",
    get: (it) => String(pick(it.raw ?? {}, "REF_FABRICA", "REFERENCIA", "REFFABRICA") ?? "") },
  { id: "und", label: "UND", kind: "text", width: 56, visible: false, align: "center",
    get: (it) => it.unidade ?? "UN" },
  { id: "codbarras", label: "COD.BARRAS", kind: "text", width: 130, visible: false, align: "left",
    get: (it) => String(pick(it.raw ?? {}, "CODBARRAS", "COD_BARRAS", "EAN") ?? "") },
  { id: "total", label: "TOTAL", kind: "total", width: 108, visible: true, align: "right" },
];

const STORAGE_KEY = "delta.pedido.grid.cols.v3";

function loadCols(): ColDef[] {
  if (typeof window === "undefined") return DEFAULT_COLS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLS;
    const saved = JSON.parse(raw) as { id: string; width: number; visible: boolean }[];
    const byId = new Map(DEFAULT_COLS.map((c) => [c.id, c]));
    const result: ColDef[] = [];
    // preserva ordem salva
    for (const s of saved) {
      const base = byId.get(s.id);
      if (!base) continue;
      result.push({ ...base, width: s.width ?? base.width, visible: s.visible ?? base.visible });
      byId.delete(s.id);
    }
    // adiciona colunas novas (não salvas ainda) ao final
    for (const c of byId.values()) result.push(c);
    return result;
  } catch {
    return DEFAULT_COLS;
  }
}

function saveCols(cols: ColDef[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(cols.map((c) => ({ id: c.id, width: c.width, visible: c.visible }))),
  );
}

function itemTotal(it: PedidoItem): number {
  const bruto = it.quantidade * it.precoUnitario;
  return Math.max(0, bruto - bruto * (it.descontoPerc / 100) + bruto * (it.acrescimoPerc / 100));
}

interface Props {
  rascunhoId: string;
  itens: PedidoItem[];
  maxDesc: number;
  onOpenDiscount: () => void;
  onEditItem?: (it: PedidoItem) => void;
}

export function ItemsGrid({ rascunhoId, itens, maxDesc, onOpenDiscount, onEditItem }: Props) {
  const { reorderItems, removeItem, updateItem } = usePedidoStore();
  const [cols, setCols] = useState<ColDef[]>(() => loadCols());
  const [dragRow, setDragRow] = useState<number | null>(null);
  const [overRow, setOverRow] = useState<number | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    saveCols(cols);
  }, [cols]);

  const visibleCols = useMemo(() => cols.filter((c) => c.visible), [cols]);
  const totalWidth = visibleCols.reduce((s, c) => s + c.width, 0);

  // Resize
  const resizingRef = useRef<{ id: string; startX: number; startW: number } | null>(null);
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const r = resizingRef.current;
      if (!r) return;
      const dx = e.clientX - r.startX;
      const w = Math.max(40, r.startW + dx);
      setCols((prev) => prev.map((c) => (c.id === r.id ? { ...c, width: w } : c)));
    }
    function onUp() {
      resizingRef.current = null;
      document.body.style.cursor = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function startResize(id: string, w: number, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { id, startX: e.clientX, startW: w };
    document.body.style.cursor = "col-resize";
  }

  function updateDescPerc(it: PedidoItem, perc: number) {
    const bruto = it.quantidade * it.precoUnitario;
    updateItem(rascunhoId, it.id, {
      descontoPerc: perc,
      descontoValor: (bruto * perc) / 100 / (it.quantidade || 1),
    });
  }
  function updateDescVal(it: PedidoItem, valUnit: number) {
    const perc = it.precoUnitario > 0 ? (valUnit / it.precoUnitario) * 100 : 0;
    updateItem(rascunhoId, it.id, { descontoValor: valUnit, descontoPerc: perc });
  }

  function moveCol(fromId: string, toId: string) {
    if (fromId === toId) return;
    setCols((prev) => {
      const from = prev.findIndex((c) => c.id === fromId);
      const to = prev.findIndex((c) => c.id === toId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  }

  function renderCell(c: ColDef, it: PedidoItem, idx: number) {
    const excede = it.descontoPerc > maxDesc;
    const align = c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left";
    if (c.kind === "action") {
      return (
        <div className="flex items-center justify-center gap-1">
          <div
            className="cursor-grab rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
            title="Arraste para reordenar"
            aria-label="Reordenar linha"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        </div>
      );
    }
    if (c.kind === "editQtd") {
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={it.quantidade}
          onChange={(e) => updateItem(rascunhoId, it.id, { quantidade: parseFloat(e.target.value) || 0 })}
          className="h-6 w-full border-0 bg-transparent px-1 text-right text-sm shadow-none focus-visible:bg-background focus-visible:ring-1"
        />
      );
    }
    if (c.kind === "editPreco") {
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={it.precoUnitario}
          onChange={(e) => updateItem(rascunhoId, it.id, { precoUnitario: parseFloat(e.target.value) || 0 })}
          className="h-6 w-full border-0 bg-transparent px-1 text-right text-sm shadow-none focus-visible:bg-background focus-visible:ring-1"
        />
      );
    }
    if (c.kind === "editDescPerc") {
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={Number(it.descontoPerc.toFixed(2))}
          onChange={(e) => updateDescPerc(it, parseFloat(e.target.value) || 0)}
          className={`h-6 w-full border-0 bg-transparent px-1 text-right text-sm shadow-none focus-visible:bg-background focus-visible:ring-1 ${excede ? "text-destructive" : ""}`}
        />
      );
    }
    if (c.kind === "editDescVal") {
      const val = it.descontoValor ?? (it.precoUnitario * it.descontoPerc) / 100;
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={Number(val.toFixed(2))}
          onChange={(e) => updateDescVal(it, parseFloat(e.target.value) || 0)}
          className="h-6 w-full border-0 bg-transparent px-1 text-right text-sm shadow-none focus-visible:bg-background focus-visible:ring-1"
        />
      );
    }
    if (c.kind === "editAcresc") {
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={it.acrescimoPerc}
          onChange={(e) => updateItem(rascunhoId, it.id, { acrescimoPerc: parseFloat(e.target.value) || 0 })}
          className="h-6 w-full border-0 bg-transparent px-1 text-right text-sm shadow-none focus-visible:bg-background focus-visible:ring-1"
        />
      );
    }
    if (c.kind === "total") {
      return <div className={`px-2 font-semibold text-primary ${align}`}>{formatBRL(itemTotal(it))}</div>;
    }
    if (c.kind === "money") {
      const v = Number(c.get?.(it, idx) ?? 0);
      return <div className={`px-2 ${align}`}>{formatBRL(v)}</div>;
    }
    const v = c.get?.(it, idx) ?? "";
    return <div className={`truncate px-2 ${align}`} title={String(v)}>{String(v)}</div>;
  }

  return (
    <div className="w-full min-w-0 rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-end gap-1.5 border-b bg-muted/30 px-2 py-1">
        <div className="mr-auto text-[10px] text-muted-foreground">
          {itens.length} {itens.length === 1 ? "item" : "itens"}
        </div>

          {selectedId && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 text-[11px]"
                onClick={() => {
                  const it = itens.find((i) => i.id === selectedId);
                  if (!it) return;
                  onEditItem?.(it);
                  removeItem(rascunhoId, it.id);
                  setSelectedId(null);
                }}
              >
                <Pencil className="h-3 w-3" /> Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 text-[11px] text-destructive hover:text-destructive"
                onClick={() => {
                  removeItem(rascunhoId, selectedId);
                  setSelectedId(null);
                }}
              >
                <Trash2 className="h-3 w-3" /> Excluir
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]" onClick={onOpenDiscount}>
            Descontos e acréscimos
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 gap-1 text-[11px]">
                <Columns3 className="h-3 w-3" /> Colunas
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground">
                  Exibir e ordenar colunas
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                <span>Arraste • Clique para exibir/ocultar</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5 hover:bg-accent"
                    onClick={() =>
                      setCols((prev) =>
                        prev.map((x) => (x.id === "handle" ? x : { ...x, visible: true })),
                      )
                    }
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    className="rounded border px-2 py-0.5 hover:bg-accent"
                    onClick={() =>
                      setCols((prev) =>
                        prev.map((x) => (x.id === "handle" ? x : { ...x, visible: false })),
                      )
                    }
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>
              <div className="max-h-80 space-y-0.5 overflow-auto">
                {cols
                  .filter((c) => c.id !== "handle")
                  .map((c) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={() => setDragCol(c.id)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragCol && dragCol !== c.id) moveCol(dragCol, c.id);
                      }}
                      onDragEnd={() => setDragCol(null)}
                      className={`flex cursor-grab items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent active:cursor-grabbing ${
                        dragCol === c.id ? "opacity-50" : ""
                      }`}
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      <Checkbox
                        checked={c.visible}
                        onCheckedChange={(v) =>
                          setCols((prev) =>
                            prev.map((x) => (x.id === c.id ? { ...x, visible: !!v } : x)),
                          )
                        }
                      />
                      <span className="flex-1 select-none">{c.label || c.id}</span>
                    </div>
                  ))}
              </div>
              <div className="mt-2 border-t pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-xs"
                  onClick={() => setCols(DEFAULT_COLS)}
                >
                  Restaurar padrão
                </Button>
              </div>
            </PopoverContent>
          </Popover>
      </div>


      {itens.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground">
          Nenhum produto adicionado.
        </div>
      ) : (
        <div className="w-full overflow-auto" style={{ maxHeight: 340 }}>
          <div style={{ minWidth: totalWidth }}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex border-b bg-muted/70 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {visibleCols.map((c) => (
                <div
                  key={c.id}
                  className="relative shrink-0 border-r last:border-r-0"
                  style={{ width: c.width }}
                >
                  <div className={`px-2 py-1 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"}`}>
                    {c.label}
                  </div>

                  {c.id !== "handle" && (
                    <div
                      onPointerDown={(e) => startResize(c.id, c.width, e)}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40"
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Body */}
            <div>
              {itens.map((it, idx) => {
                const isAvulso = (it.marca ?? "").toUpperCase() === "AVULSO" || !it.produtoId;
                const isSelected = selectedId === it.id;
                return (
                <div
                  key={it.id}
                  draggable
                  onClick={() => setSelectedId((prev) => (prev === it.id ? null : it.id))}
                  onDragStart={(e) => {
                    setDragRow(idx);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragRow !== null && dragRow !== idx) setOverRow(idx);
                  }}
                  onDragLeave={() => {
                    if (overRow === idx) setOverRow(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragRow !== null && dragRow !== idx) {
                      reorderItems(rascunhoId, dragRow, idx);
                    }
                    setDragRow(null);
                    setOverRow(null);
                  }}
                  onDragEnd={() => {
                    setDragRow(null);
                    setOverRow(null);
                  }}
                  className={`flex cursor-pointer border-b text-xs transition-colors hover:bg-accent/30 ${
                    isAvulso ? "bg-amber-100/60 dark:bg-amber-900/20" : idx % 2 === 1 ? "bg-muted/20" : ""
                  } ${dragRow === idx ? "opacity-40" : ""} ${
                    overRow === idx ? "ring-2 ring-inset ring-primary" : ""
                  } ${isSelected ? "ring-2 ring-inset ring-primary bg-primary/10" : ""}`}
                >
                  {visibleCols.map((c) => (
                    <div
                      key={c.id}
                      className="flex shrink-0 items-center border-r py-0.5 last:border-r-0"
                      style={{ width: c.width }}
                    >
                      <div className="w-full">{renderCell(c, it, idx)}</div>
                    </div>
                  ))}
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
