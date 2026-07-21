import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_BASE_URL = "http://localhost:3000";
const STORAGE_KEY = "delta.api_base_url";
const LEGACY_NGROK_URL = "https://proactive-unnoticed-outfit.ngrok-free.dev";

export function normalizeApiBaseUrl(url: string | null | undefined): string {
  const normalized = (url ?? "").trim().replace(/\/+$/, "");
  return !normalized || normalized === LEGACY_NGROK_URL ? DEFAULT_BASE_URL : normalized;
}

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BASE_URL;
  return normalizeApiBaseUrl(localStorage.getItem(STORAGE_KEY));
}

export function setApiBaseUrl(url: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, normalizeApiBaseUrl(url));
}

export interface ApiCallOptions {
  method?: string;
  operador?: string;
  logToDb?: boolean;
  since?: string | null; // ISO date; enviado como ?since=... quando presente
  body?: unknown;
}

export async function apiCall<T = any>(
  path: string,
  { method = "GET", operador, logToDb = true, since, body }: ApiCallOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  const sep = path.includes("?") ? "&" : "?";
  const query = since ? `${sep}since=${encodeURIComponent(since)}` : "";
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}${query}`;
  const start = Date.now();
  let status = 0;
  let ok = false;
  let errorMsg: string | null = null;
  let data: any = null;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    status = res.status;
    ok = res.ok;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      errorMsg = typeof data === "string" ? data : data?.error || `HTTP ${res.status}`;
      throw new Error(errorMsg || "Erro na API");
    }
    // Desembrulha envelopes comuns da API. Algumas versões do middleware usam
    // o nome da rota como chave (ex.: { parceiros: [...] }).
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      (Array.isArray((data as any).data) ||
        Array.isArray((data as any).rows) ||
        Array.isArray((data as any).result) ||
        Array.isArray((data as any).items) ||
        Array.isArray((data as any).parceiros) ||
        Array.isArray((data as any).clientes) ||
        Array.isArray((data as any).estoque) ||
        Array.isArray((data as any).produtos))
    ) {
      const arr =
        (data as any).data ??
        (data as any).rows ??
        (data as any).result ??
        (data as any).items ??
        (data as any).parceiros ??
        (data as any).clientes ??
        (data as any).estoque ??
        (data as any).produtos;
      return arr as T;
    }
    // Alguns middlewares devolvem o array dentro de um envelope adicional.
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const nested = Object.values(data).find((value) => Array.isArray(value));
      if (nested) return nested as T;
    }
    return data as T;
  } catch (err: any) {
    errorMsg = err?.message || String(err);
    throw err;
  } finally {
    const duration = Date.now() - start;
    if (logToDb) {
      // fire and forget
      supabase
        .from("sync_logs")
        .insert({
          operador: operador ?? null,
          rota: path,
          method,
          status_code: status || null,
          duration_ms: duration,
          ok,
          error_message: errorMsg,
          payload: ok ? null : (data ?? null),
        })
        .then(() => {});
    }
  }
}

// ---------- Cache dos payloads sincronizados (tabela api_cache no banco) ----------
export async function getCachedPayload<T = any>(rota: string): Promise<T | null> {
  const aliases = rota === "/api/parceiros"
    ? [rota, "/api/clientes", "/api/parceiros-clientes", "/api/clientes-parceiros"]
    : [rota];

  // Busca a rota principal separadamente. Assim, uma segunda linha antiga
  // de alias nunca impede o retorno do cache correto.
  for (const alias of aliases) {
    const { data, error } = await supabase
      .from("api_cache")
      .select("data, record_count")
      .eq("rota", alias)
      .limit(1);
    const row = Array.isArray(data) ? data[0] : null;
    if (!error && row?.data != null) return row.data as T;
  }
  return null;
}

export async function setCachedPayload(rota: string, data: any) {
  const count = Array.isArray(data) ? data.length : 0;
  const { error } = await supabase
    .from("api_cache")
    .upsert({ rota, data, record_count: count });
  if (error) throw new Error(`Falha ao salvar cache ${rota}: ${error.message}`);
}

const LARGE_CACHE_SEPARATOR = ":cache:";

/**
 * Usa a mesma tabela api_cache, dividindo cadastros grandes em blocos para
 * não exceder o tempo/payload aceito pelo Supabase.
 */
export async function setLargeCachedPayload(rota: string, records: any[]) {
  const chunkSize = 500;
  const prefix = `${rota}${LARGE_CACHE_SEPARATOR}`;
  const chunks = Array.from({ length: Math.ceil(records.length / chunkSize) },
    (_, index) => records.slice(index * chunkSize, (index + 1) * chunkSize),
  );
  const rows = chunks.map((chunk, index) => ({
    rota: `${prefix}${index}`,
    data: chunk,
    record_count: chunk.length,
  }));

  // Quatro blocos por envio: evita timeout mesmo para estoque e parceiros.
  for (let start = 0; start < rows.length; start += 4) {
    const { error } = await supabase.from("api_cache").upsert(rows.slice(start, start + 4));
    if (error) throw new Error(`Falha ao gravar cache ${rota}: ${error.message}`);
  }

  const { error: metaError } = await supabase.from("api_cache").upsert({
    rota: `${prefix}meta`,
    data: { chunks: chunks.length },
    record_count: records.length,
  });
  if (metaError) {
    throw new Error(`Falha ao finalizar o cache ${rota}: ${metaError.message}`);
  }
}

/** Carrega os blocos de um cadastro grande salvos na tabela api_cache. */
export async function getLargeCachedPayload(rota: string): Promise<any[]> {
  const prefix = `${rota}${LARGE_CACHE_SEPARATOR}`;
  const { data, error } = await supabase
    .from("api_cache")
    .select("rota, data")
    .like("rota", `${prefix}%`);
  if (error) throw new Error(`Falha ao carregar cache ${rota}: ${error.message}`);
  return (data ?? [])
    .filter((row) => new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+$`).test(row.rota))
    .sort((a, b) => Number(a.rota.slice(prefix.length)) - Number(b.rota.slice(prefix.length)))
    .flatMap((row) => Array.isArray(row.data) ? row.data : []);
}

export const setParceirosCache = (parceiros: any[]) => setLargeCachedPayload("/api/parceiros", parceiros);
export const getParceirosCache = () => getLargeCachedPayload("/api/parceiros");

/**
 * Faz merge de payload incremental sobre o cache existente (por id).
 * Se o backend ainda não suporta `since`, `previous` costuma ser vazio.
 */
export function mergePayload(previous: any[] | null, incoming: any[]): any[] {
  if (!previous || previous.length === 0) return incoming;
  if (!incoming || incoming.length === 0) return previous;
  const keyOf = (r: any) =>
    String(r?.ID ?? r?.id ?? r?.CODIGO ?? r?.codigo ?? r?.ID_PARCEIRO ?? r?.ID_PRODUTO ?? JSON.stringify(r));
  const map = new Map<string, any>();
  for (const r of previous) map.set(keyOf(r), r);
  for (const r of incoming) map.set(keyOf(r), r);
  return Array.from(map.values());
}



// Helpers para rotas específicas — todas usam alias default do backend
export const api = {
  health: () => apiCall("/health", { logToDb: false }),
  operadores: () => apiCall<any[]>("/api/operadores"),
  parceiros: async () => {
    try {
      const result = await apiCall<any[]>("/api/parceiros");
      if (Array.isArray(result) && result.length > 0) return result;
    } catch {
      // Tenta o alias usado por versões antigas do middleware.
    }
    return apiCall<any[]>("/api/clientes");
  },
  parceirosPropriedade: () => apiCall<any[]>("/api/parceiros-propriedade"),
  clienteDiversos: () => apiCall<any[]>("/api/cliente-diversos"),
  estoque: () => apiCall<any[]>("/api/estoque"),
  formasPagamento: () => apiCall<any[]>("/api/formas-pagamento"),
  condicoesRecebimento: () => apiCall<any[]>("/api/condicoes-recebimento"),
  operacoes: () => apiCall<any[]>("/api/operacoes"),
  cidades: () => apiCall<any[]>("/api/cidades"),
};
