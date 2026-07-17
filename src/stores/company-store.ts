import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_BASE_URL, normalizeApiBaseUrl } from "@/lib/api-client";

interface CompanyState {
  companyName: string;
  apiBaseUrl: string;
  loaded: boolean;
  load: () => Promise<void>;
  save: (patch: Partial<Pick<CompanyState, "companyName" | "apiBaseUrl">>) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companyName: "Minha Empresa",
  apiBaseUrl: DEFAULT_BASE_URL,
  loaded: false,
  load: async () => {
    const { data } = await supabase.from("app_config").select("*").eq("id", 1).maybeSingle();
    if (data) {
      set({
        companyName: data.company_name,
        apiBaseUrl: normalizeApiBaseUrl(data.api_base_url),
        loaded: true,
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("delta.api_base_url", normalizeApiBaseUrl(data.api_base_url));
      }
    } else {
      set({ loaded: true });
    }
  },
  save: async (patch) => {
    const current = get();
    const next = {
      company_name: patch.companyName ?? current.companyName,
      api_base_url: normalizeApiBaseUrl(patch.apiBaseUrl ?? current.apiBaseUrl),
    };
    await supabase.from("app_config").update(next).eq("id", 1);
    set({
      companyName: next.company_name,
      apiBaseUrl: next.api_base_url,
    });
    if (typeof window !== "undefined" && patch.apiBaseUrl) {
      localStorage.setItem("delta.api_base_url", normalizeApiBaseUrl(patch.apiBaseUrl));
    }
  },
}));
