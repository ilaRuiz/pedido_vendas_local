import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { useAuthStore } from "@/stores/auth-store";
import { useCompanyStore } from "@/stores/company-store";
import { api, getCachedPayload, setCachedPayload } from "@/lib/api-client";
import { supabase } from "@/integrations/supabase/client";
import deltaLogo from "@/assets/delta-logo.png";
import { cn } from "@/lib/utils";

const ADM_PASSWORD = "estac2ul";

export const Route = createFileRoute("/login")({
  ssr: false,
  component: LoginPage,
});

interface ApiOperador {
  codigo: string;
  nome: string;
  raw: any;
  descontoMaximo?: number;
}

function LoginPage() {
  const navigate = useNavigate();
  const { setSession, saveCredential, removeCredential, savedCredentials } = useAuthStore();
  const companyName = useCompanyStore((s) => s.companyName);

  const [operador, setOperador] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [salvar, setSalvar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "create">("login");
  const [open, setOpen] = useState(false);

  const [operadoresApi, setOperadoresApi] = useState<ApiOperador[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);

  // Carrega lista de operadores da API
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let raw = await getCachedPayload<any[]>("/api/operadores");
        if (!raw || raw.length === 0) {
          raw = await api.operadores();
          if (Array.isArray(raw)) await setCachedPayload("/api/operadores", raw);
        }
        const list: ApiOperador[] = (raw as any[])
          .map((o) => {
            const codigo = String(
              o.CODOPERADOR ?? o.CODIGO ?? o.codigo ?? o.CD_OPERADOR ?? o.id ?? "",
            ).toUpperCase().trim();
            const nome = String(
              o.NOMEOPERADOR ?? o.NOME ?? o.nome ?? o.APELIDO ?? codigo,
            ).trim();
            const d = Number(o.LIMITE_DESCONTO ?? o.DESCONTO_MAXIMO ?? o.desconto_maximo);
            return {
              codigo,
              nome,
              raw: o,
              descontoMaximo: isNaN(d) ? undefined : d,
            };
          })
          .filter((o) => o.codigo);
        if (alive) setOperadoresApi(list);
      } catch (err: any) {
        if (alive) toast.error("Não foi possível carregar operadores: " + err.message);
      } finally {
        if (alive) setLoadingOps(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Lista final para o combobox: ADM sempre no topo + operadores da API
  const listaOperadores = useMemo<ApiOperador[]>(() => {
    const adm: ApiOperador = { codigo: "ADM", nome: "Administrador", raw: null, descontoMaximo: 100 };
    const semAdm = operadoresApi.filter((o) => o.codigo !== "ADM");
    return [adm, ...semAdm];
  }, [operadoresApi]);

  const opAtual = listaOperadores.find(
    (o) => o.codigo === operador.toUpperCase(),
  );

  // Autofill se houver credencial salva
  useEffect(() => {
    if (!operador) return;
    const match = savedCredentials.find(
      (c) => c.operador.toUpperCase() === operador.toUpperCase(),
    );
    if (match) {
      setSenha(match.senha);
      setSalvar(true);
    }
  }, [operador, savedCredentials]);

  useEffect(() => {
    if (savedCredentials.length === 1 && !operador) {
      setOperador(savedCredentials[0].operador);
    }
  }, [savedCredentials, operador]);

  useEffect(() => {
    setMode("login");
    setConfirmSenha("");
  }, [operador]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!operador.trim()) return toast.error("Selecione um operador");
    setLoading(true);
    try {
      const op = operador.trim().toUpperCase();

      // ADM: senha fixa, sem cadastro/reset
      if (op === "ADM") {
        if (senha !== ADM_PASSWORD) throw new Error("Senha do ADM incorreta");
        finalize({
          codigo: "ADM",
          nome: "Administrador",
          isAdmin: true,
          descontoMaximo: 100,
        });
        return;
      }

      // Valida operador na API
      const encontrado = operadoresApi.find((o) => o.codigo === op);
      if (!encontrado) throw new Error("Operador não encontrado");

      // Busca configuração/senha salva
      const { data: cfg } = await supabase
        .from("operadores_config")
        .select("*")
        .eq("operador", op)
        .maybeSingle();

      const senhaCadastrada = cfg?.senha && cfg.senha.length > 0;

      if (!senhaCadastrada) {
        if (mode !== "create") {
          setMode("create");
          setSenha("");
          setConfirmSenha("");
          toast.info("Primeiro acesso: defina uma senha para este operador");
          return;
        }
        if (senha.length < 4) throw new Error("A senha deve ter pelo menos 4 caracteres");
        if (senha !== confirmSenha) throw new Error("A confirmação não confere");
        const { error } = await supabase.from("operadores_config").upsert({
          operador: op,
          senha,
          desconto_maximo: cfg?.desconto_maximo ?? (encontrado.descontoMaximo ?? 5),
        });
        if (error) throw new Error(error.message);
        toast.success("Senha cadastrada com sucesso");
      } else if (senha !== cfg!.senha) {
        throw new Error("Senha incorreta");
      }

      const desc = Number(cfg?.desconto_maximo ?? encontrado.descontoMaximo ?? 5);
      finalize({
        codigo: op,
        nome: encontrado.nome,
        isAdmin: false,
        descontoMaximo: isNaN(desc) ? 5 : desc,
        raw: encontrado.raw,
      });
    } catch (err: any) {
      toast.error(err.message || "Falha no login");
    } finally {
      setLoading(false);
    }

    function finalize(session: {
      codigo: string; nome: string; isAdmin: boolean; descontoMaximo: number; raw?: any;
    }) {
      setSession(session);
      if (salvar) saveCredential({ operador: session.codigo, senha });
      else removeCredential(session.codigo);
      toast.success(`Bem-vindo, ${session.nome}`);
      navigate({ to: "/app" });
    }
  }

  const isAdmSelected = operador.toUpperCase() === "ADM";

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-accent to-secondary px-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
            <img src={deltaLogo} alt="Delta" className="h-16 w-16 object-cover" />
          </div>
          <CardTitle className="text-2xl">Delta Pedidos</CardTitle>
          <CardDescription>{companyName}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Operador</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={mode === "create"}
                  >
                    <span className="truncate">
                      {opAtual
                        ? `${opAtual.codigo} — ${opAtual.nome}`
                        : loadingOps
                          ? "Carregando operadores..."
                          : "Selecione um operador"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command
                    filter={(value, search) =>
                      value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }
                  >
                    <CommandInput placeholder="Buscar por nome ou código..." />
                    <CommandList>
                      <CommandEmpty>Nenhum operador.</CommandEmpty>
                      <CommandGroup>
                        {listaOperadores.map((o) => (
                          <CommandItem
                            key={o.codigo}
                            value={`${o.codigo} ${o.nome}`}
                            onSelect={() => {
                              setOperador(o.codigo);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                opAtual?.codigo === o.codigo ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{o.nome}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {o.codigo}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">
                {mode === "create" ? "Criar senha (mín. 4 caracteres)" : "Senha"}
              </Label>
              <Input
                id="senha"
                type="password"
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>
            {mode === "create" && !isAdmSelected && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmSenha}
                  onChange={(e) => setConfirmSenha(e.target.value)}
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="salvar"
                checked={salvar}
                onCheckedChange={(v) => setSalvar(!!v)}
              />
              <Label htmlFor="salvar" className="cursor-pointer text-sm font-normal">
                Salvar senha neste dispositivo
              </Label>
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-primary">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "create" ? (
                "Cadastrar senha e entrar"
              ) : (
                "Entrar"
              )}
            </Button>
            {mode === "create" && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMode("login");
                  setSenha("");
                  setConfirmSenha("");
                }}
              >
                Cancelar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
