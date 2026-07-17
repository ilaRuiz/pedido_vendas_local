import { format, addDays } from "date-fns";

export function formatBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(n) ? n : 0,
  );
}

export function formatDateBR(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "dd/MM/yyyy");
}

// Tenta extrair os dias de parcelas da condição:
// - "30/60/90", "0-30-60", "30,60,90" → usa esses dias
// - "3X", "2 x" → gera N parcelas usando INTERVALO (default 30) e ENTRADA
// - qualquer número isolado como fallback
export function parseDiasCondicao(c: any): number[] {
  if (!c) return [0];
  const desc = String(
    c.DSCCONDREC ?? c.dsccondrec ?? c.DESCRICAO ?? c.descricao ?? c.NOME ?? c.nome ?? c.DIAS ?? c.dias ?? "",
  );

  const seqMatch = desc.match(/\d+(?:\s*[\/,\-]\s*\d+)+/);
  if (seqMatch) {
    const arr = seqMatch[0]
      .split(/[\/,\-]/)
      .map((n) => parseInt(n.trim(), 10))
      .filter((n) => !isNaN(n) && n < 3650);
    if (arr.length > 0) return arr;
  }

  const nxMatch = desc.match(/(\d+)\s*x/i);
  if (nxMatch) {
    const n = Math.max(1, parseInt(nxMatch[1], 10));
    const intervalo = Number(
      c.INTERVALO ?? c.intervalo ?? c.DIAS_INTERVALO ?? c.PRAZO ?? c.prazo ?? 30,
    );
    const entradaRaw = c.ENTRADA ?? c.entrada ?? c.PRIMEIRA_PARCELA ?? c.DIAS_PRIMEIRA;
    const entrada =
      entradaRaw !== null && entradaRaw !== undefined && entradaRaw !== ""
        ? Number(entradaRaw)
        : intervalo;
    return Array.from({ length: n }, (_, i) => entrada + i * intervalo);
  }

  const nums = desc.match(/\d+/g);
  if (nums && nums.length > 0) {
    const arr = nums.map((n) => parseInt(n, 10)).filter((n) => !isNaN(n) && n < 3650);
    if (arr.length > 0) return arr;
  }
  return [0];
}

export interface Parcela {
  numero: number;
  dias: number;
  vencimento: string;
  valor: number;
}

export function simularParcelas(total: number, dias: number[], base = new Date()): Parcela[] {
  const diasValidos = (dias && dias.length > 0 ? dias : [0]).map((d) =>
    Number.isFinite(d) ? d : 0,
  );
  const n = diasValidos.length;
  const valor = Math.round((total / n) * 100) / 100;
  const parcelas: Parcela[] = [];
  let somaParciais = 0;
  const baseValida = base instanceof Date && !isNaN(base.getTime()) ? base : new Date();
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const v = isLast ? Math.round((total - somaParciais) * 100) / 100 : valor;
    somaParciais += v;
    const venc = addDays(baseValida, diasValidos[i]);
    parcelas.push({
      numero: i + 1,
      dias: diasValidos[i],
      vencimento: isNaN(venc.getTime()) ? "" : format(venc, "dd/MM/yyyy"),
      valor: v,
    });
  }
  return parcelas;
}
