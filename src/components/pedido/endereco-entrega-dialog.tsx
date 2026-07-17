import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { EnderecoEntrega } from "@/stores/pedido-store";
import { maskCEP, maskCPFCNPJ, maskIE, maskTelefone, maskUF } from "@/lib/masks";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: EnderecoEntrega;
  onSave: (data: EnderecoEntrega) => void;
  titulo?: string;
}

export function EnderecoEntregaDialog({ open, onOpenChange, initial, onSave, titulo }: Props) {
  const [data, setData] = useState<EnderecoEntrega>(initial ?? {});
  useEffect(() => {
    if (open) setData(initial ?? {});
  }, [open, initial]);

  const set = (patch: Partial<EnderecoEntrega>) => setData((d) => ({ ...d, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {titulo ?? "Endereço de entrega"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1 lg:col-span-3">
            <Label className="text-xs">Nome / Razão</Label>
            <Input value={data.nome ?? ""} onChange={(e) => set({ nome: e.target.value })} />
          </div>
          <div className="space-y-1 lg:col-span-3">
            <Label className="text-xs">CPF / CNPJ</Label>
            <Input value={data.cpf ?? ""} onChange={(e) => set({ cpf: maskCPFCNPJ(e.target.value) })} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Telefone</Label>
            <Input value={data.telefone ?? ""} onChange={(e) => set({ telefone: maskTelefone(e.target.value) })} placeholder="(00) 00000-0000" />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">RG</Label>
            <Input value={data.rg ?? ""} onChange={(e) => set({ rg: e.target.value })} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">I.E. (IECadPro)</Label>
            <Input value={data.ie ?? ""} onChange={(e) => set({ ie: maskIE(e.target.value) })} placeholder="ISENTO ou nº I.E." />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">CEP</Label>
            <Input value={data.cep ?? ""} onChange={(e) => set({ cep: maskCEP(e.target.value) })} placeholder="00000-000" />
          </div>
          <div className="space-y-1 lg:col-span-3">
            <Label className="text-xs">Endereço</Label>
            <Input value={data.endereco ?? ""} onChange={(e) => set({ endereco: e.target.value })} placeholder="Rua/Av." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nº</Label>
            <Input value={data.numero ?? ""} onChange={(e) => set({ numero: e.target.value })} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Bairro</Label>
            <Input value={data.bairro ?? ""} onChange={(e) => set({ bairro: e.target.value })} />
          </div>
          <div className="space-y-1 lg:col-span-3">
            <Label className="text-xs">Município</Label>
            <Input value={data.municipio ?? ""} onChange={(e) => set({ municipio: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">UF</Label>
            <Input value={data.uf ?? ""} onChange={(e) => set({ uf: maskUF(e.target.value) })} placeholder="UF" maxLength={2} />
          </div>
          <div className="space-y-1 lg:col-span-6">
            <Label className="text-xs">Ponto de referência</Label>
            <Input value={data.referencia ?? ""} onChange={(e) => set({ referencia: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(data); onOpenChange(false); }}>Salvar endereço</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
