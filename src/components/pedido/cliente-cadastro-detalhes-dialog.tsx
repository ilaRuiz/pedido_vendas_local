import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  parceiro: any;
}

// Rótulos legíveis para chaves conhecidas; para as demais mostra a própria chave.
const LABELS: Record<string, string> = {
  CODPARC: "Código",
  NOMEPARC: "Nome",
  RAZAOSOCIAL: "Razão social",
  NOMEFANTASIA: "Nome fantasia",
  CPF: "CPF",
  CNPJ: "CNPJ",
  DOCUMENTO: "Documento",
  RG: "RG",
  IE: "I.E.",
  INSCRICAO: "Inscrição",
  ENDERECO: "Endereço",
  LOGRADOURO: "Endereço",
  NUMERO: "Número",
  COMPLEMENTO: "Complemento",
  BAIRRO: "Bairro",
  MUNICIPIO: "Município",
  CIDADE: "Cidade",
  UF: "UF",
  ESTADO: "Estado",
  CEP: "CEP",
  TELEFONE: "Telefone",
  CELULAR: "Celular",
  EMAIL: "E-mail",
  EMAIL_NFE: "E-mail NF-e",
  IDN_VENDEDOR: "É vendedor",
  IDN_CLIENTE: "É cliente",
  IDN_FORNECEDOR: "É fornecedor",
  DATA_CADASTRO: "Data de cadastro",
  OBSERVACAO: "Observação",
};

function labelOf(k: string) {
  return LABELS[k.toUpperCase()] ?? k;
}

export function ClienteCadastroDetalhesDialog({ open, onOpenChange, parceiro }: Props) {
  const entries = parceiro
    ? Object.entries(parceiro).filter(
        ([, v]) => v !== null && v !== undefined && String(v).toString().trim() !== "",
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Detalhes do cliente</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Sem dados do cadastro.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {entries.map(([k, v]) => (
                <div key={k} className="rounded-md border bg-muted/30 p-2 text-xs">
                  <div className="uppercase tracking-wide text-[10px] text-muted-foreground">
                    {labelOf(k)}
                  </div>
                  <div className="mt-0.5 break-words font-medium">{String(v)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
