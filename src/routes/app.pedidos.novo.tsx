import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  X,
  Save,
  PackagePlus,
  Ban,
  Calendar,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Info,
  Check,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { createId } from "@/lib/utils";
import {
  usePedidoStore,
  calcPedidoTotais,
  type PedidoItem,
  type PedidoRascunho,
} from "@/stores/pedido-store";
import { ItemsGrid } from "@/components/pedido/items-grid";
import { DiscountDialog } from "@/components/pedido/discount-dialog";
import { EnderecoEntregaDialog } from "@/components/pedido/endereco-entrega-dialog";
import { ClienteAutocomplete, isClienteDiversos } from "@/components/pedido/cliente-autocomplete";
import { ProdutoAutocomplete } from "@/components/pedido/produto-autocomplete";
import { ClienteDiversosDialog } from "@/components/pedido/cliente-diversos-dialog";
import { ClienteCadastroDetalhesDialog } from "@/components/pedido/cliente-cadastro-detalhes-dialog";
import { ClienteCadastroDialog } from "@/components/pedido/cliente-cadastro-dialog";
import {
  useFormasPagamento,
  useCondicoesRecebimento,
  useOperacoes,
  useParceiros,
  useClienteDiversos,
  parceiroId,
  parceiroNome,
  produtoId,
  produtoNome,
  produtoPreco,
  produtoEstoque,
  produtoGrupo,
  produtoUnidade,
  pick,
} from "@/lib/api-hooks";
import { apiCall } from "@/lib/api-client";
import { formatBRL, parseDiasCondicao, simularParcelas } from "@/lib/format";
import { useConfirm } from "@/components/ui/use-confirm";

export const Route = createFileRoute("/app/pedidos/novo")({
  component: NovoPedidoPage,
});

function NovoPedidoPage() {
  const {
    rascunhos,
    activeId,
    novoRascunho,
    setActive,
    removeRascunho,
    updateRascunho,
  } = usePedidoStore();
  const navigate = useNavigate();
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    if (rascunhos.length === 0) novoRascunho();
    else if (!activeId) setActive(rascunhos[0].id);
  }, [rascunhos.length, activeId, novoRascunho, setActive]);

  const active = rascunhos.find((r) => r.id === activeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 overflow-x-auto rounded-lg border bg-card p-2 shadow-sm">
        {rascunhos.map((r) => (
          <button
            key={r.id}
            onClick={() => setActive(r.id)}
            className={`group flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              activeId === r.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent hover:bg-accent"
            }`}
          >
            <span className="max-w-[160px] truncate">
              {r.clienteNome || r.clienteDiversosData?.nome || r.titulo}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={async (e) => {
                e.stopPropagation();
                if (r.itens.length > 0 || r.clienteId) {
                  const ok = await confirm({
                    title: "Descartar este pedido?",
                    description:
                      "Todas as informações digitadas neste rascunho serão perdidas. Tem certeza que deseja continuar?",
                    confirmLabel: "Sim, descartar",
                    cancelLabel: "Continuar editando",
                    tone: "warning",
                  });
                  if (!ok) return;
                }
                removeRascunho(r.id);
              }}
              className="rounded p-0.5 opacity-60 hover:bg-destructive/20 hover:text-destructive hover:opacity-100"
              aria-label="Cancelar pedido"
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => novoRascunho()} className="shrink-0 gap-1">
          <Plus className="h-4 w-4" /> Novo
        </Button>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate({ to: "/app/consulta" })}
          >
            <ChevronRight className="h-4 w-4" /> Consulta preço
          </Button>
        </div>
      </div>

      {active && (
        <PedidoEditor rascunho={active} onChange={(patch) => updateRascunho(active.id, patch)} />
      )}
      {confirmDialog}
    </div>
  );
}

function Stepper({ etapa, onChange }: { etapa: 1 | 2; onChange: (e: 1 | 2) => void }) {
  const steps = [
    { n: 1 as const, label: "Cliente & Produtos" },
    { n: 2 as const, label: "Pagamento & Totais" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border bg-card px-2 py-1 shadow-sm">
      {steps.map((s) => {
        const active = etapa === s.n;
        const done = etapa > s.n;
        return (
          <button
            key={s.n}
            type="button"
            onClick={() => onChange(s.n)}
            title={s.label}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] transition-colors ${
              active
                ? "bg-primary/10 text-primary"
                : done
                  ? "text-primary/70 hover:bg-accent"
                  : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${
                active ? "bg-primary text-primary-foreground" : done ? "bg-primary/70 text-primary-foreground" : "bg-muted"
              }`}
            >
              {done ? <Check className="h-2.5 w-2.5" /> : s.n}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}


function PedidoEditor({
  rascunho,
  onChange,
}: {
  rascunho: PedidoRascunho;
  onChange: (patch: Partial<PedidoRascunho>) => void;
}) {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const { addItem, removeRascunho } = usePedidoStore();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [descontoOpen, setDescontoOpen] = useState(false);
  const [entregaOpen, setEntregaOpen] = useState(false);
  const [diversosOpen, setDiversosOpen] = useState(false);
  const [cadastroDetalhesOpen, setCadastroDetalhesOpen] = useState(false);
  const [cadastroClienteOpen, setCadastroClienteOpen] = useState(false);
  const [parcelasOpen, setParcelasOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refs para navegação por Enter no lançamento de produto
  const prodDescRef = useRef<HTMLInputElement>(null);
  const prodQtdRef = useRef<HTMLInputElement>(null);
  const prodPrecoRef = useRef<HTMLInputElement>(null);
  const prodDescPercRef = useRef<HTMLInputElement>(null);
  const prodAddBtnRef = useRef<HTMLButtonElement>(null);

  // Campos de lançamento do produto (produto único em edição)
  const [avulso, setAvulso] = useState(false);
  const [prodDescricao, setProdDescricao] = useState("");
  const [prodSelecionado, setProdSelecionado] = useState<any | null>(null);
  const [prodQtd, setProdQtd] = useState<string>("1");
  const [prodPreco, setProdPreco] = useState<string>("");
  const [prodDesc, setProdDesc] = useState<string>("0");

  const formasQ = useFormasPagamento();
  const condsQ = useCondicoesRecebimento();
  const opsQ = useOperacoes();
  const parceirosQ = useParceiros();
  const clienteDiversosQ = useClienteDiversos();

  const vendedores = useMemo(() => {
    const arr = parceirosQ.data ?? [];
    const isVend = (p: any) => {
      const v = pick(p, "IDN_VENDEDOR", "idn_vendedor", "VENDEDOR", "vendedor");
      if (v === undefined || v === null) return false;
      const s = String(v).trim().toUpperCase();
      return s === "S" || s === "SIM" || s === "1" || s === "TRUE" || s === "T" || s === "Y";
    };
    return arr
      .filter(isVend)
      .map((p) => ({ id: parceiroId(p), nome: parceiroNome(p) }))
      .filter((v) => v.id && v.nome)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [parceirosQ.data]);

  // Inicializa vendedor / data do pedido
  useEffect(() => {
    const patch: Partial<PedidoRascunho> = {};
    if (!rascunho.vendedorCodigo && session?.codigo) patch.vendedorCodigo = session.codigo;
    if (!rascunho.vendedorNome && session?.nome) patch.vendedorNome = session.nome;
    if (!rascunho.dataPedido) patch.dataPedido = new Date().toISOString().slice(0, 10);
    if (Object.keys(patch).length > 0) onChange(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totais = useMemo(() => calcPedidoTotais(rascunho), [rascunho]);

  const condicaoSelecionada = useMemo(
    () =>
      (condsQ.data ?? []).find(
        (c) =>
          String(pick(c, "CODCONDREC", "ID", "id", "CODIGO", "codigo") ?? "") ===
          rascunho.condicaoPagamentoId,
      ),
    [condsQ.data, rascunho.condicaoPagamentoId],
  );

  const parcelasBase = useMemo(() => {
    if (!condicaoSelecionada) return [];
    const dias = parseDiasCondicao(condicaoSelecionada);
    const base = rascunho.dataPedido ? new Date(rascunho.dataPedido + "T00:00:00") : new Date();
    return simularParcelas(totais.total, dias, base);
  }, [condicaoSelecionada, totais.total, rascunho.dataPedido]);

  const [parcelasEdit, setParcelasEdit] = useState<typeof parcelasBase>([]);
  const parcelasKeyRef = useRef<string>("");
  useEffect(() => {
    const key = `${rascunho.condicaoPagamentoId ?? ""}|${totais.total}|${parcelasBase.length}|${rascunho.dataPedido ?? ""}`;
    if (key !== parcelasKeyRef.current) {
      parcelasKeyRef.current = key;
      setParcelasEdit(parcelasBase);
    }
  }, [parcelasBase, rascunho.condicaoPagamentoId, totais.total, rascunho.dataPedido]);

  const parcelas = parcelasEdit.length > 0 ? parcelasEdit : parcelasBase;

  function updateParcela(idx: number, patch: Partial<(typeof parcelas)[number]>) {
    setParcelasEdit((prev) => {
      const base = prev.length > 0 ? prev : parcelasBase;
      const next = base.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      if (patch.valor !== undefined && next.length > idx + 1) {
        const somaAte = next.slice(0, idx + 1).reduce((s, p) => s + (Number(p.valor) || 0), 0);
        const restante = Math.max(0, totais.total - somaAte);
        const qtdRestante = next.length - (idx + 1);
        const valorBase = Math.round((restante / qtdRestante) * 100) / 100;
        let acumulado = 0;
        for (let i = idx + 1; i < next.length; i++) {
          const isLast = i === next.length - 1;
          const v = isLast
            ? Math.round((restante - acumulado) * 100) / 100
            : valorBase;
          acumulado += v;
          next[i] = { ...next[i], valor: v };
        }
      }
      return next;
    });
  }

  const maxDesc = session?.descontoMaximo ?? 5;

  function resetForm() {
    setAvulso(false);
    setProdDescricao("");
    setProdSelecionado(null);
    setProdQtd("1");
    setProdPreco("");
    setProdDesc("0");
    // volta o foco para a descrição do produto
    setTimeout(() => prodDescRef.current?.focus(), 0);
  }

  function handleSelectProduto(p: any) {
    setProdSelecionado(p);
    setProdDescricao(produtoNome(p));
    setProdPreco(String(produtoPreco(p) ?? ""));
    setProdQtd("1");
    setProdDesc("0");
  }

  function handleAdicionar() {
    const qtd = parseFloat(prodQtd.replace(",", ".")) || 0;
    const preco = parseFloat(prodPreco.replace(",", ".")) || 0;
    const desc = parseFloat(prodDesc.replace(",", ".")) || 0;
    if (qtd <= 0)
      return toast.warning("Quantidade inválida", {
        description: "Informe uma quantidade maior que zero para adicionar o produto.",
      });
    const nome = prodDescricao.trim();
    if (!nome)
      return toast.warning("Descrição obrigatória", {
        description: "Selecione um produto ou informe a descrição do item avulso.",
      });

    if (avulso || !prodSelecionado) {
      const it: PedidoItem = {
        id: createId(),
        produtoId: "",
        descricao: nome,
        marca: "AVULSO",
        grupo: "",
        unidade: "UN",
        estoqueDisponivel: undefined,
        precoCusto: 0,
        precoOriginal: preco,
        quantidade: qtd,
        precoUnitario: preco,
        descontoPerc: desc,
        descontoValor: (preco * desc) / 100,
        acrescimoPerc: 0,
      };
      addItem(rascunho.id, it);
    } else {
      const p = prodSelecionado;
      const custo = Number(
        pick(p, "VLR_CUSTO", "vlr_custo", "PRECO_CUSTO", "preco_custo", "CUSTO", "custo") ?? 0,
      );
      const it: PedidoItem = {
        id: createId(),
        produtoId: produtoId(p),
        descricao: nome,
        marca: String(pick(p, "MARCA", "marca") ?? ""),
        grupo: produtoGrupo(p),
        unidade: produtoUnidade(p),
        estoqueDisponivel: produtoEstoque(p),
        precoCusto: custo,
        precoOriginal: produtoPreco(p),
        quantidade: qtd,
        precoUnitario: preco,
        descontoPerc: desc,
        descontoValor: (preco * desc) / 100,
        acrescimoPerc: 0,
        raw: p,
      };
      addItem(rascunho.id, it);
    }
    resetForm();
  }

  function handleEditItem(it: PedidoItem) {
    setAvulso(!it.produtoId || (it.marca ?? "").toUpperCase() === "AVULSO");
    setProdDescricao(it.descricao);
    setProdSelecionado(it.raw ?? null);
    setProdQtd(String(it.quantidade));
    setProdPreco(String(it.precoUnitario));
    setProdDesc(String(it.descontoPerc));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleGravar() {
    if (rascunho.itens.length === 0)
      return toast.warning("Pedido sem produtos", {
        description: "Adicione ao menos um produto ao pedido antes de gravar.",
      });
    const nomeCliente =
      rascunho.clienteNome || rascunho.clienteDiversosData?.nome || "";
    if (!nomeCliente)
      return toast.warning("Cliente não informado", {
        description: "Selecione um cliente do cadastro ou preencha os dados do cliente diversos.",
      });
    if (!rascunho.formaPagamentoId)
      return toast.warning("Forma de pagamento pendente", {
        description: "Escolha a forma de pagamento na etapa 2 antes de gravar.",
      });
    if (!rascunho.condicaoPagamentoId)
      return toast.warning("Condição de recebimento pendente", {
        description: "Selecione a condição de recebimento na etapa 2 antes de gravar.",
      });
    const excesso = rascunho.itens.some((it) => it.descontoPerc > maxDesc);
    if (excesso)
      return toast.warning("Desconto acima do limite", {
        description: `Um ou mais itens excedem o desconto máximo permitido para o operador (${maxDesc}%). Ajuste os descontos e tente novamente.`,
      });

    setSaving(true);
    try {
      const dadosClienteDiversos = rascunho.clienteDiversos ? rascunho.clienteDiversosData ?? {} : undefined;
      const parceiroDiversos = pick(
        clienteDiversosQ.data?.[0],
        "CODCLIENTEDIVERSOS",
        "CLIENTE_DIVERSO",
        "PARCEIRO",
        "CODIGO",
      );
      const parceiroPedido = rascunho.clienteDiversos ? parceiroDiversos : rascunho.clienteId;
      if (!parceiroPedido) {
        throw new Error("Não foi possível identificar o código do cliente para gravar o pedido.");
      }
      const obsClienteDiversos = dadosClienteDiversos
        ? [
            `Cliente diversos: ${dadosClienteDiversos.nome ?? nomeCliente}`,
            dadosClienteDiversos.cpf ? `CPF/CNPJ: ${dadosClienteDiversos.cpf}` : "",
            dadosClienteDiversos.telefone ? `Telefone: ${dadosClienteDiversos.telefone}` : "",
            [dadosClienteDiversos.endereco, dadosClienteDiversos.numero, dadosClienteDiversos.referencia]
              .filter(Boolean)
              .join(", "),
            [dadosClienteDiversos.municipio, dadosClienteDiversos.uf].filter(Boolean).join("/"),
          ].filter(Boolean).join(" | ")
        : "";
      const obsPedido = [rascunho.observacao, obsClienteDiversos].filter(Boolean).join("\n");
      await apiCall("/api/pedidos", {
        method: "POST",
        body: {
          parceiro: Number(parceiroPedido),
          data_pedido: rascunho.dataPedido,
          vendedor: Number(rascunho.vendedorCodigo),
          codcondrec: Number(rascunho.condicaoPagamentoId),
          forma: Number(rascunho.formaPagamentoId),
          operador: Number(session?.codigo),
          codfilial: 1,
          obs_pedido: rascunho.observacao ?? "",
          cliente_diversos: rascunho.clienteDiversos,
          cliente_diversos_data: dadosClienteDiversos,
          itens: rascunho.itens.map((item, index) => ({
            item: index + 1,
            codproduto: Number(item.produtoId),
            codproduto_clas: Number(pick(item.raw, "CODPRODUTO_CLAS", "CODPRODUTOCLAS", "CLASSIFICACAO") ?? 1),
            qtd_pedido: item.quantidade,
            preco: item.precoUnitario,
            valor_bruto: item.quantidade * (item.precoOriginal ?? item.precoUnitario),
            valor_acrescimo: 0,
            valor_desconto: (item.descontoValor ?? 0) * item.quantidade,
            valor_liquido: item.quantidade * item.precoUnitario,
            descricao_unmed: item.unidade ?? "UN",
            und_medida: item.unidade ?? "UN",
            qtd_unmed: 1,
            obs_item: "",
          })),
          parcelas: parcelas.map((parcela) => ({
            parcela: parcela.numero,
            data_vencimento: parcela.vencimento,
            valor: parcela.valor,
            forma: Number(rascunho.formaPagamentoId),
          })),
        },
      });
      const { error } = await supabase.from("pedidos").insert({
        operador: rascunho.vendedorCodigo ?? session!.codigo,
        operador_nome: rascunho.vendedorNome ?? session!.nome,
        cliente_id: rascunho.clienteId ?? null,
        cliente_nome: nomeCliente,
        cliente_diversos: rascunho.clienteDiversos,
        cliente_data: rascunho.clienteDiversos ? rascunho.clienteDiversosData ?? {} : null,
        propriedade_id: rascunho.propriedadeId ?? null,
        itens: rascunho.itens as any,
        forma_pagamento: rascunho.formaPagamentoId,
        forma_pagamento_nome: rascunho.formaPagamentoNome,
        condicao_pagamento: rascunho.condicaoPagamentoId,
        condicao_pagamento_nome: rascunho.condicaoPagamentoNome,
        operacao: rascunho.operacaoId ?? null,
        subtotal: totais.subtotal,
        desconto: totais.desconto,
        acrescimo: totais.acrescimo,
        total: totais.total,
        parcelas: parcelas as any,
        observacao: obsPedido,
      });
      if (error) throw error;
      toast.success("Pedido gravado!", {
        description: `Total ${formatBRL(totais.total)} · ${rascunho.itens.length} item(ns).`,
      });
      removeRascunho(rascunho.id);
      navigate({ to: "/app/pedidos" });
    } catch (err: any) {
      toast.error("Erro ao gravar o pedido", {
        description: err?.message ?? "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Handlers de cliente
  function handleClienteText(v: string) {
    // Se o usuário editar o texto, "solta" o cliente selecionado
    if (rascunho.clienteId) {
      onChange({
        clienteId: undefined,
        clienteNome: v,
        clienteRaw: undefined,
        propriedadeId: undefined,
        propriedadeRaw: undefined,
        enderecoEntrega: undefined,
        clienteDiversos: true,
      });
    } else if (rascunho.clienteDiversos) {
      onChange({
        clienteDiversosData: {
          ...(rascunho.clienteDiversosData ?? { nome: "", endereco: "", cpf: "" }),
          nome: v,
        },
        clienteNome: v,
      });
    } else {
      onChange({ clienteNome: v });
    }
  }

  function handleClienteSelect(p: any) {
    const diversos = isClienteDiversos(p);
    onChange({
      clienteId: parceiroId(p),
      clienteNome: parceiroNome(p),
      clienteRaw: p,
      clienteDiversos: diversos,
      propriedadeId: undefined,
      propriedadeRaw: undefined,
      // sempre limpa o endereço de entrega do cliente anterior
      enderecoEntrega: undefined,
      clienteDiversosData: diversos
        ? {
            nome: parceiroNome(p),
            cpf: String(pick(p, "CPF", "cpf", "CNPJ", "cnpj", "DOCUMENTO") ?? ""),
            endereco: String(pick(p, "ENDERECO", "endereco", "LOGRADOURO") ?? ""),
            municipio: String(pick(p, "MUNICIPIO", "municipio", "CIDADE", "cidade") ?? ""),
            telefone: String(pick(p, "TELEFONE", "telefone", "CELULAR", "celular") ?? ""),
            uf: String(pick(p, "ESTADO", "UF", "uf") ?? ""),
            cep: String(pick(p, "CEP", "cep") ?? ""),
            bairro: String(pick(p, "BAIRRO", "bairro") ?? ""),
            numero: String(pick(p, "NUMERO", "numero") ?? ""),
          }
        : undefined,
    });
    if (diversos) setDiversosOpen(true);
  }

  const podeAvancar =
    rascunho.itens.length > 0 &&
    !!(rascunho.clienteNome || rascunho.clienteDiversosData?.nome);

  return (
    <div className="space-y-4">
      <Stepper etapa={etapa} onChange={setEtapa} />

      {etapa === 1 && (
        <>
          {/* CLIENTE */}
          <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-base font-semibold">Cliente</div>
              <div className="flex flex-wrap items-center gap-2">
                {(rascunho.clienteNome || rascunho.clienteDiversosData?.nome) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (rascunho.clienteDiversos) {
                        setDiversosOpen(true);
                      } else if (rascunho.clienteId && rascunho.clienteRaw) {
                        setCadastroDetalhesOpen(true);
                      }
                    }}
                    className="gap-2"
                  >
                    <Info className="h-4 w-4" /> Detalhes
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setCadastroClienteOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" /> Cadastrar cliente
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEntregaOpen(true)} className="gap-2">
                  <MapPin className="h-4 w-4" /> End. Entrega / Propriedade
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Cliente</Label>
              <ClienteAutocomplete
                value={rascunho.clienteNome ?? rascunho.clienteDiversosData?.nome ?? ""}
                onChangeText={handleClienteText}
                onSelect={handleClienteSelect}
              />
              {(rascunho.propriedadeRaw || rascunho.enderecoEntrega?.endereco) && (
                <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                  {rascunho.propriedadeRaw ? (
                    <>
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {String(
                        pick(
                          rascunho.propriedadeRaw,
                          "NOME_PROPRIEDADE",
                          "PROPRIEDADE",
                          "propriedade",
                          "DESCRICAO",
                        ) ?? "Propriedade",
                      )}
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-1 inline h-3 w-3" />
                      {rascunho.enderecoEntrega?.endereco}
                      {rascunho.enderecoEntrega?.numero ? `, ${rascunho.enderecoEntrega.numero}` : ""}
                      {rascunho.enderecoEntrega?.municipio ? ` · ${rascunho.enderecoEntrega.municipio}` : ""}
                      {rascunho.enderecoEntrega?.uf ? `/${rascunho.enderecoEntrega.uf}` : ""}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* LANÇAR PRODUTO */}
          <div
            className={`rounded-lg border p-3 shadow-sm transition-colors sm:p-4 ${
              avulso
                ? "border-amber-400 bg-amber-50 dark:border-amber-600/60 dark:bg-amber-900/20"
                : "bg-card"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-base font-semibold">Lançar produto</div>
              <div className="flex items-center gap-2">
                <Label htmlFor="avulso" className="text-xs text-muted-foreground">
                  Produto avulso
                </Label>
                <Switch
                  id="avulso"
                  checked={avulso}
                  onCheckedChange={(v) => {
                    setAvulso(v);
                    if (v) {
                      setProdSelecionado(null);
                    }
                  }}
                  className={avulso ? "data-[state=checked]:bg-amber-500" : ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_100px_140px_120px_auto]">
              <div className="col-span-2 space-y-1 md:col-span-1">
                <Label className="text-xs">Descrição</Label>
                {avulso ? (
                  <Input
                    ref={prodDescRef}
                    value={prodDescricao}
                    onChange={(e) => setProdDescricao(e.target.value)}
                    placeholder="Nome do produto avulso"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        prodQtdRef.current?.focus();
                        prodQtdRef.current?.select();
                      }
                    }}
                  />
                ) : (
                  <ProdutoAutocomplete
                    inputRef={prodDescRef}
                    value={prodDescricao}
                    onChangeText={(v) => {
                      setProdDescricao(v);
                      if (prodSelecionado && v !== produtoNome(prodSelecionado)) {
                        setProdSelecionado(null);
                      }
                    }}
                    onSelect={handleSelectProduto}
                    onEnter={() => {
                      prodQtdRef.current?.focus();
                      prodQtdRef.current?.select();
                    }}
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qtd</Label>
                <Input
                  ref={prodQtdRef}
                  inputMode="decimal"
                  value={prodQtd}
                  onChange={(e) => setProdQtd(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      prodPrecoRef.current?.focus();
                      prodPrecoRef.current?.select();
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço (R$)</Label>
                <Input
                  ref={prodPrecoRef}
                  inputMode="decimal"
                  value={prodPreco}
                  onChange={(e) => setProdPreco(e.target.value)}
                  placeholder="0,00"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      prodDescPercRef.current?.focus();
                      prodDescPercRef.current?.select();
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desconto %</Label>
                <Input
                  ref={prodDescPercRef}
                  inputMode="decimal"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      prodAddBtnRef.current?.click();
                    }
                  }}
                />
              </div>
              <div className="flex items-end pt-2 md:pt-0">
                <Button
                  ref={prodAddBtnRef}
                  onClick={handleAdicionar}
                  className={`w-full gap-2 md:w-auto ${avulso ? "bg-amber-500 text-white hover:bg-amber-600" : "gradient-primary"}`}
                >
                  <PackagePlus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* GRID */}
          <ItemsGrid
            rascunhoId={rascunho.id}
            itens={rascunho.itens}
            maxDesc={maxDesc}
            onOpenDiscount={() => setDescontoOpen(true)}
            onEditItem={handleEditItem}
          />

          {rascunho.itens.some((it) => it.descontoPerc > maxDesc) && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              Um ou mais itens ultrapassam o desconto máximo permitido para seu operador ({maxDesc}%).
            </div>
          )}

          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={async () => {
                const ok = await confirm({
                  title: "Cancelar este pedido?",
                  description:
                    "O rascunho será removido e as informações preenchidas não poderão ser recuperadas.",
                  confirmLabel: "Sim, cancelar pedido",
                  cancelLabel: "Voltar",
                  tone: "warning",
                });
                if (ok) removeRascunho(rascunho.id);
              }}
            >
              <Ban className="h-4 w-4" /> Cancelar pedido
            </Button>
            <Button
              onClick={() => {
                if (!podeAvancar) {
                  toast.error("Não é possível avançar", {
                    description: "Informe o cliente e adicione ao menos um produto ao pedido.",
                  });
                  return;
                }
                setEtapa(2);
              }}
              className="gap-2 gradient-primary"
            >
              Avançar <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {etapa === 2 && (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            {/* DADOS DO PEDIDO */}
            <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4 lg:col-span-2">
              <div className="mb-3 text-base font-semibold">Dados do pedido</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Data do pedido</Label>
                  <Input
                    type="date"
                    value={rascunho.dataPedido ?? ""}
                    onChange={(e) => onChange({ dataPedido: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Frete (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rascunho.frete ?? 0}
                    onChange={(e) => onChange({ frete: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Vendedor</Label>
                  <Select
                    value={rascunho.vendedorCodigo ?? ""}
                    onValueChange={(v) => {
                      const vend = vendedores.find((x) => x.id === v);
                      onChange({
                        vendedorCodigo: v,
                        vendedorNome: vend?.nome ?? rascunho.vendedorNome,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor...">
                        {rascunho.vendedorNome ?? ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Nenhum vendedor encontrado.
                        </div>
                      )}
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Operação</Label>
                  <Select
                    value={rascunho.operacaoId ?? ""}
                    onValueChange={(v) => onChange({ operacaoId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(opsQ.data ?? []).map((o) => {
                        const id = String(pick(o, "CODOPER", "ID", "id", "CODIGO", "codigo") ?? "");
                        if (!id) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            {String(pick(o, "DSCOPER", "DESCRICAO", "descricao", "NOME", "nome") ?? id)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Forma de pagamento</Label>
                  <Select
                    value={rascunho.formaPagamentoId ?? ""}
                    onValueChange={(v) => {
                      const f = (formasQ.data ?? []).find(
                        (x) => String(pick(x, "FORMA", "ID", "id", "CODIGO", "codigo") ?? "") === v,
                      );
                      onChange({
                        formaPagamentoId: v,
                        formaPagamentoNome: String(
                          pick(f, "DSCFORMA", "DESCRICAO", "descricao", "NOME", "nome") ?? v,
                        ),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(formasQ.data ?? []).map((f) => {
                        const id = String(pick(f, "FORMA", "ID", "id", "CODIGO", "codigo") ?? "");
                        if (!id) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            {String(pick(f, "DSCFORMA", "DESCRICAO", "descricao", "NOME", "nome") ?? id)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Condição de recebimento</Label>
                  <Select
                    value={rascunho.condicaoPagamentoId ?? ""}
                    onValueChange={(v) => {
                      const c = (condsQ.data ?? []).find(
                        (x) => String(pick(x, "CODCONDREC", "ID", "id", "CODIGO", "codigo") ?? "") === v,
                      );
                      onChange({
                        condicaoPagamentoId: v,
                        condicaoPagamentoNome: String(
                          pick(c, "DSCCONDREC", "DESCRICAO", "descricao", "NOME", "nome") ?? v,
                        ),
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(condsQ.data ?? []).map((c) => {
                        const id = String(pick(c, "CODCONDREC", "ID", "id", "CODIGO", "codigo") ?? "");
                        if (!id) return null;
                        return (
                          <SelectItem key={id} value={id}>
                            {String(pick(c, "DSCCONDREC", "DESCRICAO", "descricao", "NOME", "nome") ?? id)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Observação do pedido</Label>
                  <Textarea
                    rows={3}
                    value={rascunho.observacao ?? ""}
                    onChange={(e) => onChange({ observacao: e.target.value })}
                    placeholder="Observações do pedido..."
                  />
                </div>
              </div>

              {parcelas.length > 0 && (
                <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-primary">
                      Vencimentos ({parcelas.length}x)
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setParcelasOpen(true)}
                      className="h-6 gap-1 text-[10px]"
                    >
                      <Calendar className="h-3 w-3" /> Detalhes
                    </Button>
                  </div>
                  <div className="overflow-hidden rounded border bg-background">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60 text-[10px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-2 py-1 text-left">Parcela</th>
                          <th className="px-2 py-1 text-left">Vencimento</th>
                          <th className="px-2 py-1 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parcelas.map((p, idx) => {
                          const isoDate = (() => {
                            const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(p.vencimento);
                            return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
                          })();
                          return (
                            <tr key={p.numero} className="tabular-nums">
                              <td className="px-2 py-1 font-medium">
                                {p.numero}/{parcelas.length}
                              </td>
                              <td className="px-2 py-1">
                                <Input
                                  type="date"
                                  value={isoDate}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
                                    const br = m ? `${m[3]}/${m[2]}/${m[1]}` : v;
                                    updateParcela(idx, { vencimento: br });
                                  }}
                                  className="h-7 px-2 text-xs"
                                />
                              </td>
                              <td className="px-2 py-1 text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={p.valor}
                                  onChange={(e) =>
                                    updateParcela(idx, { valor: Number(e.target.value) || 0 })
                                  }
                                  className="h-7 px-2 text-right text-xs font-semibold"
                                />
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/40 font-semibold">
                          <td className="px-2 py-1" colSpan={2}>
                            Soma parcelas
                          </td>
                          <td className="px-2 py-1 text-right">
                            {formatBRL(parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {Math.abs(
                    parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0) - totais.total,
                  ) > 0.01 && (
                    <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400">
                      Atenção: soma das parcelas difere do total do pedido ({formatBRL(totais.total)}).
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TOTAIS */}
            <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
              <div className="mb-2 text-base font-semibold">Totais</div>
              <div className="space-y-1 text-sm">
                <Row label="Subtotal" value={formatBRL(totais.subtotal)} />
                <Row label="Descontos" value={`- ${formatBRL(totais.desconto)}`} />
                <Row label="Acréscimos" value={`+ ${formatBRL(totais.acrescimo)}`} />
                {totais.frete > 0 && (
                  <Row label="Frete" value={`+ ${formatBRL(totais.frete)}`} />
                )}
                <div className="my-2 h-px bg-border" />
                <Row
                  label={<span className="text-base font-semibold">Total</span>}
                  value={
                    <span className="text-xl font-bold text-primary">
                      {formatBRL(totais.total)}
                    </span>
                  }
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setEtapa(1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button
                  className="flex-1 gap-2 gradient-primary"
                  onClick={handleGravar}
                  disabled={saving}
                >
                  <Save className="h-4 w-4" /> Gravar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <DiscountDialog
        open={descontoOpen}
        onOpenChange={setDescontoOpen}
        rascunhoId={rascunho.id}
        itens={rascunho.itens}
        maxDesc={maxDesc}
      />

      <EnderecoEntregaDialog
        open={entregaOpen}
        onOpenChange={setEntregaOpen}
        titulo={rascunho.clienteDiversos ? "Endereço de entrega" : "Endereço de entrega / Propriedade"}
        initial={
          rascunho.clienteDiversos
            ? (rascunho.clienteDiversosData as any)
            : rascunho.enderecoEntrega ?? { nome: rascunho.clienteNome }
        }
        onSave={(data) => {
          if (rascunho.clienteDiversos) {
            onChange({
              clienteDiversosData: {
                ...(rascunho.clienteDiversosData ?? { nome: "", endereco: "", cpf: "" }),
                ...data,
                nome: data.nome ?? rascunho.clienteDiversosData?.nome ?? "",
                endereco: data.endereco ?? rascunho.clienteDiversosData?.endereco ?? "",
                cpf: data.cpf ?? rascunho.clienteDiversosData?.cpf ?? "",
              },
            });
          } else {
            onChange({ enderecoEntrega: data });
          }
        }}
      />

      <ClienteDiversosDialog
        open={diversosOpen}
        onOpenChange={setDiversosOpen}
        initial={rascunho.clienteDiversosData}
        onSave={(data) => {
          onChange({
            // não altera clienteDiversos se já há um cliente do cadastro selecionado
            clienteDiversos: rascunho.clienteId ? rascunho.clienteDiversos : true,
            clienteNome: data.nome || rascunho.clienteNome,
            clienteDiversosData: {
              ...(rascunho.clienteDiversosData ?? { nome: "", endereco: "", cpf: "" }),
              nome: data.nome,
              cpf: data.cpf,
              endereco: data.endereco,
              municipio: data.municipio,
              telefone: data.telefone,
            } as any,
          });
        }}
      />

      <ClienteCadastroDetalhesDialog
        open={cadastroDetalhesOpen}
        onOpenChange={setCadastroDetalhesOpen}
        parceiro={rascunho.clienteRaw}
      />
      <ClienteCadastroDialog
        open={cadastroClienteOpen}
        onOpenChange={setCadastroClienteOpen}
        parceiros={parceirosQ.data ?? []}
        onExisting={handleClienteSelect}
        onCreated={(parceiro) => {
          handleClienteSelect(parceiro);
          toast.success("Cliente cadastrado e selecionado no pedido.");
        }}
      />



      <Dialog open={parcelasOpen} onOpenChange={setParcelasOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Parcelas e vencimentos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Forma</div>
                <div className="font-medium">{rascunho.formaPagamentoNome ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Condição</div>
                <div className="font-medium">{rascunho.condicaoPagamentoNome ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Nº de parcelas</div>
                <div className="font-medium">{parcelas.length}x</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-bold text-primary">{formatBRL(totais.total)}</div>
              </div>
            </div>
            {parcelas.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Selecione forma e condição para simular os vencimentos.
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Parcela</th>
                      <th className="px-3 py-2 text-left">Vencimento</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parcelas.map((p) => (
                      <tr key={p.numero}>
                        <td className="px-3 py-2 font-medium">
                          {p.numero}/{parcelas.length}
                        </td>
                        <td className="px-3 py-2">
                          {p.vencimento}
                          <span className="ml-2 text-xs text-muted-foreground">({p.dias}d)</span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">
                          {formatBRL(p.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setParcelasOpen(false)}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {confirmDialog}
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
