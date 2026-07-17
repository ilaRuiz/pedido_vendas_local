import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "@/lib/utils";

export interface PedidoItem {
  id: string;                  // uuid local
  produtoId: string;
  descricao: string;
  marca?: string;
  grupo?: string;
  unidade?: string;
  estoqueDisponivel?: number;
  precoCusto?: number;         // custo unitário (VLR_CUSTO)
  precoOriginal?: number;      // preço venda original de tabela
  quantidade: number;
  precoUnitario: number;       // preço praticado (com margem/desconto aplicado)
  descontoPerc: number;        // % desconto sobre preço original
  descontoValor?: number;      // R$ desconto por unidade
  acrescimoPerc: number;
  raw?: any;                   // registro bruto do estoque (para colunas dinâmicas)
}

export interface EnderecoEntrega {
  nome?: string;
  cpf?: string;
  rg?: string;
  ie?: string; // IECadPro
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  referencia?: string;
}

export interface ClienteDiversosData extends EnderecoEntrega {
  nome: string;
  endereco: string;
  cpf: string;
}

export interface PedidoRascunho {
  id: string;
  titulo: string;
  clienteDiversos: boolean;
  clienteId?: string;
  clienteNome?: string;
  clienteRaw?: any;
  propriedadeId?: string;
  propriedadeRaw?: any;
  clienteDiversosData?: ClienteDiversosData;
  enderecoEntrega?: EnderecoEntrega;
  itens: PedidoItem[];
  formaPagamentoId?: string;
  formaPagamentoNome?: string;
  condicaoPagamentoId?: string;
  condicaoPagamentoNome?: string;
  condicaoParcelasDias?: number[]; // dias das parcelas
  operacaoId?: string;
  observacao?: string;
  frete?: number;
  dataPedido?: string; // ISO yyyy-MM-dd
  vendedorCodigo?: string;
  vendedorNome?: string;
  createdAt: string;
}

interface PedidoStore {
  rascunhos: PedidoRascunho[];
  activeId: string | null;
  novoRascunho: () => string;
  setActive: (id: string) => void;
  removeRascunho: (id: string) => void;
  updateRascunho: (id: string, patch: Partial<PedidoRascunho>) => void;
  addItem: (id: string, item: PedidoItem) => void;
  updateItem: (id: string, itemId: string, patch: Partial<PedidoItem>) => void;
  removeItem: (id: string, itemId: string) => void;
  moveItem: (id: string, itemId: string, dir: -1 | 1) => void;
  reorderItems: (id: string, fromIdx: number, toIdx: number) => void;
  clearAll: () => void;
}

function newRascunho(): PedidoRascunho {
  return {
    id: createId(),
    titulo: "Novo pedido",
    clienteDiversos: true,
    itens: [],
    createdAt: new Date().toISOString(),
  };
}

export const usePedidoStore = create<PedidoStore>()(
  persist(
    (set, get) => ({
      rascunhos: [],
      activeId: null,
      novoRascunho: () => {
        const r = newRascunho();
        set((s) => ({
          rascunhos: [...s.rascunhos, r],
          activeId: r.id,
        }));
        return r.id;
      },
      setActive: (id) => set({ activeId: id }),
      removeRascunho: (id) =>
        set((s) => {
          const rest = s.rascunhos.filter((r) => r.id !== id);
          return {
            rascunhos: rest,
            activeId: s.activeId === id ? (rest[0]?.id ?? null) : s.activeId,
          };
        }),
      updateRascunho: (id, patch) =>
        set((s) => ({
          rascunhos: s.rascunhos.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      addItem: (id, item) =>
        set((s) => ({
          rascunhos: s.rascunhos.map((r) =>
            r.id === id ? { ...r, itens: [...r.itens, item] } : r,
          ),
        })),
      updateItem: (id, itemId, patch) =>
        set((s) => ({
          rascunhos: s.rascunhos.map((r) =>
            r.id === id
              ? { ...r, itens: r.itens.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
              : r,
          ),
        })),
      removeItem: (id, itemId) =>
        set((s) => ({
          rascunhos: s.rascunhos.map((r) =>
            r.id === id ? { ...r, itens: r.itens.filter((it) => it.id !== itemId) } : r,
          ),
        })),
      moveItem: (id, itemId, dir) =>
        set((s) => ({
          rascunhos: s.rascunhos.map((r) => {
            if (r.id !== id) return r;
            const idx = r.itens.findIndex((it) => it.id === itemId);
            if (idx < 0) return r;
            const target = idx + dir;
            if (target < 0 || target >= r.itens.length) return r;
            const itens = [...r.itens];
            [itens[idx], itens[target]] = [itens[target], itens[idx]];
            return { ...r, itens };
          }),
        })),
      reorderItems: (id, fromIdx, toIdx) =>
        set((s) => ({
          rascunhos: s.rascunhos.map((r) => {
            if (r.id !== id) return r;
            if (fromIdx === toIdx || fromIdx < 0 || fromIdx >= r.itens.length) return r;
            const itens = [...r.itens];
            const [moved] = itens.splice(fromIdx, 1);
            const target = Math.max(0, Math.min(itens.length, toIdx));
            itens.splice(target, 0, moved);
            return { ...r, itens };
          }),
        })),
      clearAll: () => set({ rascunhos: [], activeId: null }),
    }),
    { name: "delta.pedidos" },
  ),
);

export function calcItemTotal(it: PedidoItem): number {
  const bruto = it.quantidade * it.precoUnitario;
  const desc = bruto * (it.descontoPerc / 100);
  const acr = bruto * (it.acrescimoPerc / 100);
  return Math.max(0, bruto - desc + acr);
}

export function calcPedidoTotais(rasc: PedidoRascunho) {
  const subtotal = rasc.itens.reduce((sum, it) => sum + it.quantidade * it.precoUnitario, 0);
  const desconto = rasc.itens.reduce(
    (sum, it) => sum + it.quantidade * it.precoUnitario * (it.descontoPerc / 100),
    0,
  );
  const acrescimo = rasc.itens.reduce(
    (sum, it) => sum + it.quantidade * it.precoUnitario * (it.acrescimoPerc / 100),
    0,
  );
  const frete = Number(rasc.frete ?? 0) || 0;
  const total = subtotal - desconto + acrescimo + frete;
  return { subtotal, desconto, acrescimo, frete, total };
}
