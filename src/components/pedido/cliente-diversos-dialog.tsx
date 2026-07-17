import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { maskCPFCNPJ, maskTelefone } from "@/lib/masks";
import type { ClienteDiversosData } from "@/stores/pedido-store";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<ClienteDiversosData> & { email?: string };
  onSave: (data: ClienteDiversosData & { email?: string }) => void;
}

export function ClienteDiversosDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [d, setD] = useState<ClienteDiversosData & { email?: string }>({
    nome: "",
    cpf: "",
    endereco: "",
    municipio: "",
    telefone: "",
    email: "",
  });

  useEffect(() => {
    if (open) {
      setD({
        nome: initial?.nome ?? "",
        cpf: initial?.cpf ?? "",
        endereco: initial?.endereco ?? "",
        municipio: initial?.municipio ?? "",
        telefone: initial?.telefone ?? "",
        email: (initial as any)?.email ?? "",
      });
    }
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dados do cliente diversos</DialogTitle>
        </DialogHeader>
        <div
          className="grid gap-3"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const t = e.target as HTMLElement;
            if (t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
            e.preventDefault();
            const inputs = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>("input, button"),
            ).filter((el) => !(el as HTMLInputElement).disabled);
            const idx = inputs.indexOf(t);
            const next = inputs[idx + 1];
            if (next) next.focus();
          }}
        >
          <div className="space-y-1">
            <Label className="text-xs">CPF / CNPJ</Label>
            <Input value={d.cpf} onChange={(e) => setD({ ...d, cpf: maskCPFCNPJ(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input value={d.nome} onChange={(e) => setD({ ...d, nome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Endereço</Label>
            <Input value={d.endereco} onChange={(e) => setD({ ...d, endereco: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Município</Label>
            <Input value={d.municipio ?? ""} onChange={(e) => setD({ ...d, municipio: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Telefone</Label>
            <Input
              value={d.telefone ?? ""}
              onChange={(e) => setD({ ...d, telefone: maskTelefone(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">E-mail</Label>
            <Input
              type="email"
              value={d.email ?? ""}
              onChange={(e) => setD({ ...d, email: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSave(d);
                onOpenChange(false);
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
