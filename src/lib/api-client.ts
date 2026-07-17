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
}

export async function apiCall<T = any>(
  path: string,
  { method = "GET", operador, logToDb = true, since }: ApiCallOptions = {},
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
      },
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
    // Desembrulha envelopes comuns { data: [...] } / { rows: [...] } / { result: [...] }
    if (
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      (Array.isArray((data as any).data) ||
        Array.isArray((data as any).rows) ||
        Array.isArray((data as any).result) ||
        Array.isArray((data as any).items))
    ) {
      const arr =
        (data as any).data ??
        (data as any).rows ??
        (data as any).result ??
        (data as any).items;
      return arr as T;
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
  const { data, error } = await supabase
    .from("api_cache")
    .select("data")
    .eq("rota", rota)
    .maybeSingle();
  if (error || !data) return null;
  return (data.data as T) ?? null;
}

export async function setCachedPayload(rota: string, data: any) {
  const count = Array.isArray(data) ? data.length : 0;
  const { error } = await supabase
    .from("api_cache")
    .upsert({ rota, data, record_count: count });
  if (error) console.warn("Falha ao salvar cache", rota, error);
}

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
  parceiros: () => apiCall<any[]>("/api/parceiros"),
  parceirosPropriedade: () => apiCall<any[]>("/api/parceiros-propriedade"),
  clienteDiversos: () => apiCall<any[]>("/api/cliente-diversos"),
  estoque: () => apiCall<any[]>("/api/estoque"),
  formasPagamento: () => apiCall<any[]>("/api/formas-pagamento"),
  condicoesRecebimento: () => apiCall<any[]>("/api/condicoes-recebimento"),
  operacoes: () => apiCall<any[]>("/api/operacoes"),
};
