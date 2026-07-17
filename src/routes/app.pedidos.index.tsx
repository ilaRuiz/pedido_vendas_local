import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { format } from "date-fns";
import { useConfirm } from "@/components/ui/use-confirm";

export const Route = createFileRoute("/app/pedidos/")({
  component: PedidosPage,
});

function PedidosPage() {
  const session = useAuthStore((s) => s.session);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function reload() {
    setLoading(true);
    let query = supabase.from("pedidos").select("*").order("created_at", { ascending: false });
    if (!session?.isAdmin) query = query.eq("operador", session?.codigo ?? "");
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else setPedidos(data ?? []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, [session?.codigo, session?.isAdmin]);

  const filtered = pedidos.filter((p) => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return (
      p.cliente_nome?.toLowerCase().includes(t) ||
      p.operador_nome?.toLowerCase().includes(t) ||
      String(p.numero).includes(t)
    );
  });

  async function handleDelete(id: string, numero?: number | string) {
    const ok = await confirm({
      title: "Excluir pedido?",
      description: (
        <>
          O pedido {numero ? <b>nº {numero}</b> : "selecionado"} será removido definitivamente.
          Essa ação não pode ser desfeita.
        </>
      ),
      confirmLabel: "Sim, excluir",
      cancelLabel: "Manter pedido",
      tone: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("pedidos").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível excluir o pedido", { description: error.message });
    } else {
      toast.success("Pedido excluído", { description: "O registro foi removido com sucesso." });
      reload();
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Pedidos gravados</CardTitle>
          <Input
            placeholder="Buscar por cliente, vendedor ou nº..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-sm"
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">#{p.numero}</TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const d = p.created_at ? new Date(p.created_at) : null;
                          return d && !isNaN(d.getTime()) ? format(d, "dd/MM/yyyy HH:mm") : "—";
                        })()}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{p.cliente_nome}</TableCell>
                      <TableCell className="text-sm">{p.operador_nome ?? p.operador}</TableCell>
                      <TableCell>{Array.isArray(p.itens) ? p.itens.length : 0}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(Number(p.total))}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "gravado" ? "default" : "secondary"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setDetalhe(p)}>
                          Detalhes
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id, p.numero)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Pedido #{detalhe?.numero}</DialogTitle></DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <div><b>Cliente:</b> {detalhe.cliente_nome} {detalhe.cliente_diversos && <Badge variant="secondary">Diversos</Badge>}</div>
              <div><b>Vendedor:</b> {detalhe.operador_nome ?? detalhe.operador}</div>
              <div><b>Pagamento:</b> {detalhe.forma_pagamento_nome} · {detalhe.condicao_pagamento_nome}</div>
              {detalhe.observacao && <div><b>Obs:</b> {detalhe.observacao}</div>}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtde</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detalhe.itens ?? []).map((it: any, i: number) => {
                      const bruto = it.quantidade * it.precoUnitario;
                      const tot = bruto - bruto * (it.descontoPerc / 100) + bruto * (it.acrescimoPerc / 100);
                      return (
                        <TableRow key={i}>
                          <TableCell>{it.descricao}</TableCell>
                          <TableCell>{it.quantidade}</TableCell>
                          <TableCell>{formatBRL(it.precoUnitario)}</TableCell>
                          <TableCell className="text-right">{formatBRL(tot)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between text-base">
                <b>Total</b>
                <b className="text-primary">{formatBRL(Number(detalhe.total))}</b>
              </div>
              {Array.isArray(detalhe.parcelas) && detalhe.parcelas.length > 0 && (
                <div className="rounded-md bg-muted/40 p-2">
                  <div className="mb-1 text-xs font-medium">Parcelas</div>
                  {detalhe.parcelas.map((p: any) => (
                    <div key={p.numero} className="flex justify-between text-sm">
                      <span>{p.numero} · {p.vencimento}</span>
                      <span>{formatBRL(p.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
