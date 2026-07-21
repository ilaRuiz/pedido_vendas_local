import { useQuery } from "@tanstack/react-query";
import { api, getCachedPayload, getLargeCachedPayload, getParceirosCache, setCachedPayload } from "@/lib/api-client";

// Utilitários pra normalizar as respostas heterogêneas do Firebird.
export function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    const up = k.toUpperCase();
    if (obj[up] !== undefined && obj[up] !== null) return obj[up];
    const lo = k.toLowerCase();
    if (obj[lo] !== undefined && obj[lo] !== null) return obj[lo];
  }
  return undefined;
}

/** Remove acentos e baixa-caixa para busca. */
export function normalize(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Divide a busca em tokens e exige que TODOS estejam presentes no texto. */
export function matchTokens(haystack: string, query: string): boolean {
  const h = normalize(haystack);
  return matchNormalizedTokens(h, query);
}

export function matchNormalizedTokens(normalizedHaystack: string, query: string): boolean {
  const h = normalizedHaystack;
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => h.includes(t));
}

/**
 * Lê do cache no banco (api_cache). Se estiver vazio, busca da API,
 * grava no cache e retorna. Assim, após a primeira sincronização todo
 * o app passa a ler diretamente da tabela — muito mais rápido.
 */
async function cachedFetch(rota: string, apiFn: () => Promise<any[]>, allowApiFallback = true) {
  const cached = await getCachedPayload<any[]>(rota);
  // Compatibilidade com caches gravados por versões que armazenavam um
  // envelope ({ data/rows/clientes/parceiros: [...] }) em vez do array.
  const cachedList = extractList(cached);
  if (cachedList.length > 0) return cachedList;

  // A pesquisa de clientes deve depender somente do Supabase. Se ainda não
  // houver carga nesse cache, retorna imediatamente sem aguardar o middleware.
  if (!allowApiFallback) return [];

  try {
    const fresh = await apiFn();
    const arr = extractList(fresh);
    await setCachedPayload(rota, arr);
    return arr;
  } catch (error) {
    // A pesquisa continua disponível com o último cache, mesmo sem o
    // middleware local. Não transforma indisponibilidade da API em lista vazia.
    if (cachedList.length > 0) return cachedList;
    throw error;
  }
}

function extractList(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { return extractList(JSON.parse(value)); } catch { return []; }
  }
  if (!value || typeof value !== "object") return [];
  for (const key of Object.keys(value)) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const key of Object.keys(value)) {
    const nested = extractList(value[key]);
    if (nested.length > 0) return nested;
  }
  return [];
}

export function useParceiros() {
  return useQuery({
    // v2 invalida listas vazias mantidas no cache do navegador antes da
    // sincronização dos parceiros no Supabase.
    queryKey: ["parceiros-cache-v1"],
    // A pesquisa de clientes é somente leitura no Supabase. O middleware não
    // participa deste carregamento e, portanto, não pode bloquear a tela.
    queryFn: async () => {
      return getParceirosCache();
    },
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
}
export function useParceirosPropriedade() {
  return useQuery({
    queryKey: ["cache", "/api/parceiros-propriedade"],
    queryFn: () => cachedFetch("/api/parceiros-propriedade", api.parceirosPropriedade),
    staleTime: 5 * 60 * 1000,
  });
}
export function useClienteDiversos() {
  return useQuery({
    queryKey: ["cache", "/api/cliente-diversos"],
    queryFn: () => cachedFetch("/api/cliente-diversos", api.clienteDiversos),
    staleTime: 5 * 60 * 1000,
  });
}
export function useEstoque() {
  return useQuery({
    queryKey: ["estoque-cache-v2"],
    queryFn: async () => {
      const chunked = await getLargeCachedPayload("/api/estoque");
      if (chunked.length > 0) return chunked;
      return cachedFetch("/api/estoque", api.estoque);
    },
    staleTime: 5 * 60 * 1000,
  });
}
export function useFormasPagamento() {
  return useQuery({
    queryKey: ["cache", "/api/formas-pagamento"],
    queryFn: () => cachedFetch("/api/formas-pagamento", api.formasPagamento),
    staleTime: 10 * 60 * 1000,
  });
}
export function useCondicoesRecebimento() {
  return useQuery({
    queryKey: ["cache", "/api/condicoes-recebimento"],
    queryFn: () => cachedFetch("/api/condicoes-recebimento", api.condicoesRecebimento),
    staleTime: 10 * 60 * 1000,
  });
}
export function useOperacoes() {
  return useQuery({
    queryKey: ["cache", "/api/operacoes"],
    queryFn: () => cachedFetch("/api/operacoes", api.operacoes),
    staleTime: 10 * 60 * 1000,
  });
}
export function useCidades() {
  return useQuery({
    queryKey: ["cache", "/api/cidades"],
    queryFn: () => cachedFetch("/api/cidades", api.cidades),
    staleTime: 60 * 60 * 1000,
  });
}


export function parceiroId(p: any): string {
  return String(pick(p, "PARCEIRO", "ID_PARCEIRO", "id_parceiro", "CODIGO", "codigo", "id") ?? "");
}
export function parceiroNome(p: any): string {
  const known = String(
    pick(p, "NOME", "nome", "FANTASIA", "fantasia", "RAZAO_SOCIAL", "razao_social") ?? "",
  );
  if (known) return known;
  return String(Object.values(p ?? {}).find((value) => typeof value === "string" && value.trim()) ?? "");
}
export function parceiroBusca(p: any): string {
  const known = [
    pick(p, "NOME", "nome"),
    pick(p, "FANTASIA", "fantasia"),
    pick(p, "RAZAO_SOCIAL", "razao_social", "APELIDO", "apelido"),
    pick(p, "TELEFONE", "telefone", "CELULAR", "celular"),
    pick(p, "ENDERECO", "endereco", "LOGRADOURO", "logradouro"),
    pick(p, "MUNICIPIO", "municipio", "CIDADE", "cidade"),
    pick(p, "CPF", "cpf", "CNPJ", "cnpj", "DOCUMENTO", "documento"),
    pick(p, "PARCEIRO"),
  ];
  return [...known, ...Object.values(p ?? {})]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function produtoId(p: any): string {
  return String(
    pick(p, "CODPRODUTO", "ID_PRODUTO", "id_produto", "CODIGO", "codigo", "id") ?? "",
  );
}
export function produtoNome(p: any): string {
  return String(pick(p, "DSCPRODUTO", "DESCRICAO", "descricao", "NOME", "nome") ?? "");
}
export function produtoPreco(p: any): number {
  return Number(
    pick(p, "PRECO_VENDA", "preco_venda", "PRECO", "preco", "VALOR_VENDA", "valor_venda") ?? 0,
  );
}
export function produtoEstoque(p: any): number {
  return Number(
    pick(p, "QTD_ESTOQUE", "qtd_estoque", "SALDO", "saldo", "ESTOQUE", "estoque", "QUANTIDADE", "quantidade") ?? 0,
  );
}
export function produtoUnidade(p: any): string {
  return String(pick(p, "UND_MEDIDA", "UNIDADE", "unidade", "UN", "un") ?? "UN");
}
export function produtoGrupo(p: any): string {
  return String(pick(p, "DSCAGRUPAMENTO", "GRUPO", "grupo", "CATEGORIA", "categoria") ?? "");
}
export function produtoBusca(p: any): string {
  return [
    pick(p, "DSCPRODUTO", "DESCRICAO", "descricao", "NOME", "nome"),
    pick(p, "MARCA", "marca"),
    pick(p, "DSCAGRUPAMENTO", "GRUPO", "grupo", "CATEGORIA", "categoria"),
    pick(p, "CODPRODUTO", "CODIGO", "codigo", "ID_PRODUTO", "id_produto"),
    pick(p, "REF_FABRICA", "REFFABRICA", "REFERENCIA", "referencia"),
    pick(p, "REF_PARALELA", "REFPARALELA", "REF_PAR", "REFPAR"),
    pick(p, "REFERENCIA_ORIGINAL", "REF_ORIGINAL", "REF_ORIG"),
    pick(p, "CODBARRAS", "COD_BARRAS", "EAN", "GTIN"),
    pick(p, "CODIGO_AUXILIAR", "COD_AUX", "AUXILIAR"),
    pick(p, "FABRICANTE", "fabricante"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
