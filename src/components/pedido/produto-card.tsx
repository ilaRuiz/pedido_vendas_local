import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  produtoId,
  produtoNome,
  produtoPreco,
  produtoEstoque,
  produtoUnidade,
  produtoGrupo,
  pick,
} from "@/lib/api-hooks";
import { formatBRL } from "@/lib/format";

interface Props {
  produto: any;
  onClick?: () => void;
  actionSlot?: React.ReactNode;
}

/** Card visual unificado para exibir produto em resultados de pesquisa.
 *  Mostra TODOS os campos indexados na busca (marca, grupo, refs, cód. barras, etc). */
export function ProdutoCard({ produto: p, onClick, actionSlot }: Props) {
  const preco = produtoPreco(p);
  const est = produtoEstoque(p);
  const marca = String(pick(p, "MARCA", "marca") ?? "");
  const grupo = produtoGrupo(p);
  const und = produtoUnidade(p);
  const codigo = produtoId(p);
  const refFabrica = String(
    pick(p, "REF_FABRICA", "REFFABRICA", "REFERENCIA", "referencia") ?? "",
  );
  const refParalela = String(
    pick(p, "REF_PARALELA", "REFPARALELA", "REF_PAR", "REFPAR") ?? "",
  );
  const refOriginal = String(
    pick(p, "REFERENCIA_ORIGINAL", "REF_ORIGINAL", "REF_ORIG") ?? "",
  );
  const codBarras = String(
    pick(p, "CODBARRAS", "COD_BARRAS", "EAN", "GTIN") ?? "",
  );
  const codAux = String(
    pick(p, "CODIGO_AUXILIAR", "COD_AUX", "AUXILIAR") ?? "",
  );
  const fabricante = String(pick(p, "FABRICANTE", "fabricante") ?? "");
  const semEstoque = est <= 0;
  const estoqueBaixo = est > 0 && est <= 5;

  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={
        "flex w-full items-start gap-3 p-3 text-left transition-colors " +
        (onClick ? "hover:bg-accent" : "")
      }
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Package className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-tight">{produtoNome(p)}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          {marca && (
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
              {marca}
            </Badge>
          )}
          {grupo && (
            <Badge variant="outline" className="text-[10px]">
              {grupo}
            </Badge>
          )}
          {fabricante && fabricante !== marca && (
            <Badge variant="outline" className="text-[10px]">
              Fab: {fabricante}
            </Badge>
          )}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground sm:grid-cols-3">
          {codigo && (
            <span>
              <b className="text-foreground/70">Cód:</b> {codigo}
            </span>
          )}
          {refFabrica && (
            <span>
              <b className="text-foreground/70">Ref. Fábrica:</b> {refFabrica}
            </span>
          )}
          {refParalela && (
            <span>
              <b className="text-foreground/70">Ref. Paralela:</b> {refParalela}
            </span>
          )}
          {refOriginal && (
            <span>
              <b className="text-foreground/70">Ref. Original:</b> {refOriginal}
            </span>
          )}
          {codBarras && (
            <span>
              <b className="text-foreground/70">Cód. Barras:</b> {codBarras}
            </span>
          )}
          {codAux && (
            <span>
              <b className="text-foreground/70">Cód. Aux:</b> {codAux}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="text-lg font-bold text-primary">{formatBRL(preco)}</div>
        <div className="text-[10px] text-muted-foreground">por {und}</div>
        <Badge
          variant={semEstoque ? "destructive" : "outline"}
          className={
            semEstoque
              ? ""
              : estoqueBaixo
                ? "border-amber-500/50 text-amber-500"
                : "border-emerald-500/50 text-emerald-500"
          }
        >
          {semEstoque ? "Sem estoque" : `Estoque: ${est} ${und}`}
        </Badge>
        {actionSlot}
      </div>
    </Wrapper>
  );
}
