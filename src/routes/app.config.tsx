import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, RotateCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCompanyStore } from "@/stores/company-store";
import { supabase } from "@/integrations/supabase/client";
import { apiCall, getCachedPayload, setCachedPayload, setLargeCachedPayload, mergePayload } from "@/lib/api-client";
import { format } from "date-fns";

export const Route = createFileRoute("/app/config")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("delta.auth");
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.state?.session?.isAdmin) {
      throw redirect({ to: "/app" });
    }
  },
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Área administrativa</p>
      </div>
      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="operadores">Operadores</TabsTrigger>
          <TabsTrigger value="logs">Logs de sync</TabsTrigger>
          <TabsTrigger value="sync">Sincronizações</TabsTrigger>
        </TabsList>
        <TabsContent value="geral"><GeralTab /></TabsContent>
        <TabsContent value="operadores"><OperadoresTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
        <TabsContent value="sync"><SyncTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function GeralTab() {
  const { companyName, apiBaseUrl, save, load } = useCompanyStore();
  const [nome, setNome] = useState(companyName);
  const [url, setUrl] = useState(apiBaseUrl);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { setNome(companyName); setUrl(apiBaseUrl); }, [companyName, apiBaseUrl]);

  async function handleSave() {
    setSaving(true);
    try {
      await save({ companyName: nome, apiBaseUrl: url.replace(/\/+$/, "") });
      toast.success("Configurações salvas");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true);
    try {
      if (typeof window !== "undefined") localStorage.setItem("delta.api_base_url", url);
      const res = await apiCall("/health", { logToDb: false });
      toast.success("Conexão OK: " + JSON.stringify(res).slice(0, 80));
    } catch (e: any) {
      toast.error("Falha: " + e.message);
    } finally { setTesting(false); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão & Empresa</CardTitle>
        <CardDescription>URL da API Firebird e nome exibido no topo do sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Nome da empresa</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>URL base da API</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          <p className="text-xs text-muted-foreground">
            Para esta instalação local, use <code>http://localhost:3000</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="gradient-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Testar conexão"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OperadoresTab() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOps, setApiOps] = useState<any[]>([]);

  async function reload() {
    setLoading(true);
    const { data } = await supabase.from("operadores_config").select("*").order("operador");
    setList(data ?? []);
    try { setApiOps(await apiCall<any[]>("/api/operadores")); } catch {}
    setLoading(false);
  }
  useEffect(() => { reload(); }, []);

  async function upsert(operador: string, patch: any) {
    const { error } = await supabase.from("operadores_config").upsert({ operador, ...patch });
    if (error) toast.error(error.message);
    else { toast.success("Salvo"); reload(); }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operadores</CardTitle>
        <CardDescription>
          Ajuste o desconto máximo por operador. As senhas são criadas pelo próprio operador
          no primeiro login — aqui você pode apenas resetá-las se necessário.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead className="w-32">Desc. máx (%)</TableHead>
                  <TableHead className="w-40">Senha</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Nenhuma configuração ainda.</TableCell></TableRow>
                )}
                {list.map((o) => (
                  <OperadorRow key={o.operador} op={o} onSave={(patch) => upsert(o.operador, patch)} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div>
          <Label className="text-xs">Adicionar operador (da API):</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {apiOps.slice(0, 20).map((o) => {
              const cod = String(o.CODIGO ?? o.codigo ?? o.NOME ?? o.nome ?? "").toUpperCase();
              const has = list.find((x) => x.operador === cod);
              if (!cod || has) return null;
              return (
                <Button key={cod} size="sm" variant="outline" onClick={() => upsert(cod, { desconto_maximo: 5 })}>
                  <Users className="mr-1 h-3 w-3" /> {cod}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OperadorRow({ op, onSave }: { op: any; onSave: (patch: any) => void }) {
  const [desc, setDesc] = useState<number>(Number(op.desconto_maximo ?? 5));
  const senhaCadastrada = !!(op.senha && String(op.senha).length > 0);
  return (
    <TableRow>
      <TableCell className="font-mono">{op.operador}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          max={100}
          value={desc}
          onChange={(e) => setDesc(parseFloat(e.target.value) || 0)}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        {senhaCadastrada ? (
          <Badge variant="secondary">Cadastrada</Badge>
        ) : (
          <Badge variant="outline">Não cadastrada</Badge>
        )}
      </TableCell>
      <TableCell className="space-x-2 whitespace-nowrap">
        <Button size="sm" onClick={() => onSave({ desconto_maximo: desc })}>
          Salvar
        </Button>
        {senhaCadastrada && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (confirm(`Resetar a senha do operador ${op.operador}? Ele definirá uma nova no próximo login.`)) {
                onSave({ desconto_maximo: desc, senha: null });
              }
            }}
          >
            Resetar senha
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "err">("all");

  async function reload() {
    setLoading(true);
    let q = supabase.from("sync_logs").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter === "err") q = q.eq("ok", false);
    const { data } = await q;
    setLogs(data ?? []);
    setLoading(false);
  }
  useEffect(() => { reload(); }, [filter]);

  async function clearOld() {
    if (!confirm("Excluir logs com mais de 7 dias?")) return;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("sync_logs").delete().lt("created_at", cutoff);
    reload();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Logs de sincronização</CardTitle>
          <CardDescription>Últimas 200 chamadas à API externa.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Todos</Button>
          <Button variant={filter === "err" ? "default" : "outline"} size="sm" onClick={() => setFilter("err")}>Só erros</Button>
          <Button variant="outline" size="sm" onClick={reload}><RotateCw className="h-3 w-3" /></Button>
          <Button variant="outline" size="sm" onClick={clearOld}>Limpar antigos</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="p-6"><Loader2 className="h-4 w-4 animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Nenhum log.</TableCell></TableRow>}
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{format(new Date(l.created_at), "dd/MM HH:mm:ss")}</TableCell>
                    <TableCell className="font-mono text-xs">{l.rota}</TableCell>
                    <TableCell><Badge variant="outline">{l.method}</Badge></TableCell>
                    <TableCell>
                      {l.ok ? (
                        <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />{l.status_code}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" />{l.status_code ?? "-"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{l.duration_ms} ms</TableCell>
                    <TableCell className="max-w-[280px] truncate text-xs text-destructive">{l.error_message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SyncTab() {
  const rotinas = [
    { rota: "/api/operadores", nome: "Operadores" },
    { rota: "/api/parceiros", nome: "Parceiros / Clientes" },
    { rota: "/api/parceiros-propriedade", nome: "Propriedades" },
    { rota: "/api/cliente-diversos", nome: "Cliente diversos" },
    { rota: "/api/estoque", nome: "Estoque / Produtos" },
    { rota: "/api/formas-pagamento", nome: "Formas de pagamento" },
    { rota: "/api/condicoes-recebimento", nome: "Condições" },
    { rota: "/api/operacoes", nome: "Operações" },
  ];
  const [state, setState] = useState<Record<string, { last_sync_at: string | null; record_count: number; last_ok: boolean; last_error: string | null }>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [runningAll, setRunningAll] = useState(false);

  async function reloadState() {
    const { data } = await supabase.from("sync_state").select("*");
    const map: any = {};
    (data ?? []).forEach((r: any) => { map[r.rota] = r; });
    setState(map);
  }
  useEffect(() => { reloadState(); }, []);

  async function run(rota: string, opts: { full?: boolean } = {}) {
    setRunning((s) => ({ ...s, [rota]: true }));
    const previous = await getCachedPayload<any[]>(rota);
    const since = !opts.full ? state[rota]?.last_sync_at ?? null : null;
    try {
      const res = await apiCall<any[]>(rota, { since });
      const arr = Array.isArray(res) ? res : [];
      const merged = opts.full ? arr : mergePayload(previous, arr);
      if (rota === "/api/parceiros" || rota === "/api/estoque") {
        await setLargeCachedPayload(rota, opts.full ? arr : merged);
      } else {
        await setCachedPayload(rota, merged);
      }
      const patch = {
        rota,
        last_sync_at: new Date().toISOString(),
        record_count: merged.length,
        last_ok: true,
        last_error: null,
      };
      await supabase.from("sync_state").upsert(patch);
      setState((s) => ({ ...s, [rota]: patch }));
      toast.success(`${rota}: ${arr.length} registro(s) recebido(s) · total em cache ${merged.length}`);
    } catch (e: any) {
      const patch = {
        rota,
        last_sync_at: state[rota]?.last_sync_at ?? null,
        record_count: state[rota]?.record_count ?? 0,
        last_ok: false,
        last_error: e?.message ?? String(e),
      };
      await supabase.from("sync_state").upsert(patch);
      setState((s) => ({ ...s, [rota]: patch }));
      toast.error(`${rota}: ${patch.last_error}`);
    } finally {
      setRunning((s) => ({ ...s, [rota]: false }));
    }
  }

  async function runAll(opts: { full?: boolean } = {}) {
    setRunningAll(true);
    try {
      for (const r of rotinas) await run(r.rota, opts);
    } finally { setRunningAll(false); }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Sincronização manual</CardTitle>
          <CardDescription>
            Baixa e mantém em cache local os dados da API. A partir da segunda
            sincronização, é enviado o parâmetro <code>?since=</code> com a data
            e hora da última carga — a API pode usá-lo para retornar apenas
            registros novos ou alterados.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => runAll({ full: true })} disabled={runningAll}>
            {runningAll ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Recarregar tudo (full)
          </Button>
          <Button onClick={() => runAll()} disabled={runningAll} className="gradient-primary">
            {runningAll ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Sincronizar tudo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {rotinas.map((r) => {
          const st = state[r.rota];
          const busy = !!running[r.rota];
          return (
            <div key={r.rota} className="flex items-center justify-between rounded-md border p-3">
              <div className="min-w-0">
                <div className="font-medium">{r.nome}</div>
                <div className="truncate text-xs text-muted-foreground">{r.rota}</div>
                <div className="mt-1 text-xs">
                  {st?.last_sync_at ? (
                    <span className={st.last_ok ? "text-success" : "text-destructive"}>
                      {st.last_ok ? "✓" : "✗"} {st.record_count} em cache · última{" "}
                      {format(new Date(st.last_sync_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Nunca sincronizado</span>
                  )}
                  {st?.last_error && (
                    <div className="text-destructive">{st.last_error}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="sm" variant="outline" onClick={() => run(r.rota)} disabled={busy}>
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => run(r.rota, { full: true })} disabled={busy} title="Recarga completa">
                  full
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
