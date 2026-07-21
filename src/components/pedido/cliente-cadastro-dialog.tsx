import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiCall } from "@/lib/api-client";
import { maskCPFCNPJ, maskTelefone } from "@/lib/masks";
import { normalize, parceiroNome, pick, useCidades } from "@/lib/api-hooks";

interface ClienteForm {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  endereco: string;
  numero: string;
  complemento: string;
  municipio: string;
  uf: string;
  cep: string;
}

const EMPTY: ClienteForm = { nome: "", documento: "", telefone: "", email: "", endereco: "", numero: "", complemento: "", municipio: "", uf: "", cep: "" };
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

function documentoDoParceiro(parceiro: any) {
  return digits(pick(parceiro, "CPF", "CNPJ", "DOCUMENTO", "documento", "CPF_CNPJ"));
}

function respostaParceiro(value: any): any {
  if (Array.isArray(value)) return value[0] ?? null;
  if (value?.data && !Array.isArray(value.data)) return value.data;
  if (value?.parceiro) return value.parceiro;
  if (value?.cliente) return value.cliente;
  return value;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parceiros: any[];
  onCreated: (parceiro: any) => void;
  onExisting: (parceiro: any) => void;
}

export function ClienteCadastroDialog({ open, onOpenChange, parceiros, onCreated, onExisting }: Props) {
  const [form, setForm] = useState<ClienteForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const cidadesQ = useCidades();
  const documento = digits(form.documento);
  const existente = useMemo(
    () => documento.length >= 11 ? parceiros.find((parceiro) => documentoDoParceiro(parceiro) === documento) : undefined,
    [documento, parceiros],
  );

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  async function buscarCep() {
    const cep = digits(form.cep);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error("CEP inválido.");
      const endereco = await response.json();
      if (endereco.erro) throw new Error("CEP não encontrado.");
      const cidade = (cidadesQ.data ?? []).find((item) =>
        normalize(String(pick(item, "CIDADE", "cidade") ?? "")) === normalize(endereco.localidade) &&
        String(pick(item, "ESTADO", "estado", "UF", "uf") ?? "").toUpperCase() === String(endereco.uf).toUpperCase(),
      );
      setForm((current) => ({
        ...current,
        cep: endereco.cep ?? current.cep,
        endereco: endereco.logradouro ?? current.endereco,
        municipio: String(pick(cidade, "CODIGO", "codigo") ?? endereco.localidade ?? current.municipio),
        uf: endereco.uf ?? current.uf,
      }));
      toast.success("Endereço preenchido pelo CEP.");
    } catch (error: any) {
      toast.warning(error?.message ?? "Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do cliente.");
    if (documento.length !== 11 && documento.length !== 14) return toast.error("Informe um CPF ou CNPJ válido.");
    if (existente) {
      toast.warning("Já existe um cliente com este CPF/CNPJ.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        razao_social: form.nome.trim(),
        fantasia: form.nome.trim(),
        municipio: form.municipio,
        codfilial_cadastro: 1,
        pessoa_fj: documento.length === 14 ? "J" : "F",
        cpf: documento.length === 11 ? documento : null,
        cnpj: documento.length === 14 ? documento : null,
        email: form.email,
        telefone: digits(form.telefone),
        celular: digits(form.telefone),
        endereco: form.endereco,
        numero: form.numero,
        complemento: form.complemento,
        bairro: "",
        uf: form.uf.trim().toUpperCase(),
        cep: digits(form.cep),
        idn_cliente: "S",
        idn_fornecedor: "N",
      };
      const response = await apiCall<any>("/api/parceiros", { method: "POST", body: payload });
      const created = respostaParceiro(response);
      if (!created || typeof created !== "object") throw new Error("A API não retornou os dados do cliente cadastrado.");
      const parceiro = typeof created === "number"
        ? { ...payload, PARCEIRO: created, NOME: payload.razao_social }
        : { ...payload, ...created, PARCEIRO: created.parceiro ?? created.PARCEIRO, NOME: created.nome ?? created.NOME ?? payload.razao_social };
      onCreated(parceiro);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message ?? "Não foi possível cadastrar o cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Cadastrar cliente</DialogTitle></DialogHeader>
        <div
          className="grid gap-3 sm:grid-cols-2"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            const target = event.target as HTMLInputElement;
            if (target.tagName !== "INPUT") return;
            event.preventDefault();
            const fields = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>("input:not(:disabled)"));
            const next = fields[fields.indexOf(target) + 1];
            if (next) next.focus(); else void salvar();
          }}
        >
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Nome / Razão social</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">CPF / CNPJ</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: maskCPFCNPJ(e.target.value) })} /></div>
          <div className="space-y-1"><Label className="text-xs">CEP</Label><Input value={form.cep} placeholder="00000-000" onChange={(e) => setForm({ ...form, cep: digits(e.target.value).slice(0, 8) })} onBlur={() => void buscarCep()} />{cepLoading && <div className="text-xs text-muted-foreground">Buscando endereço...</div>}</div>
          <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })} /></div>
          {existente && <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm sm:col-span-2"><div>Já cadastrado: <b>{parceiroNome(existente)}</b></div><Button className="mt-2" size="sm" variant="outline" onClick={() => { onExisting(existente); onOpenChange(false); }}>Usar cliente existente</Button></div>}
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Número</Label><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Complemento</Label><Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Município</Label><select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.municipio} onChange={(e) => { const city = (cidadesQ.data ?? []).find((item) => String(pick(item, "CODIGO", "codigo")) === e.target.value); setForm({ ...form, municipio: e.target.value, uf: String(pick(city, "ESTADO", "estado", "UF", "uf") ?? form.uf) }); }}><option value="">Selecione a cidade</option>{(cidadesQ.data ?? []).map((city) => <option key={String(pick(city, "CODIGO", "codigo"))} value={String(pick(city, "CODIGO", "codigo"))}>{String(pick(city, "CIDADE", "cidade") ?? "")} - {String(pick(city, "ESTADO", "estado", "UF", "uf") ?? "")}</option>)}</select></div>
          <div className="space-y-1"><Label className="text-xs">UF</Label><Input maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button><Button onClick={salvar} disabled={saving || !!existente}>{saving ? "Cadastrando..." : "Cadastrar e usar"}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
