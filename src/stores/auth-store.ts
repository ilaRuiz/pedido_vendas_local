import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OperadorSession {
  codigo: string;         // login/código do operador (ex.: "ADM")
  nome: string;           // nome de exibição
  isAdmin: boolean;
  descontoMaximo: number; // % permitido
  raw?: any;
}

interface SavedCredential {
  operador: string;
  senha: string;
}

interface AuthState {
  session: OperadorSession | null;
  savedCredentials: SavedCredential[];
  setSession: (s: OperadorSession | null) => void;
  saveCredential: (c: SavedCredential) => void;
  removeCredential: (operador: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      savedCredentials: [],
      setSession: (session) => set({ session }),
      saveCredential: (c) =>
        set((s) => ({
          savedCredentials: [
            ...s.savedCredentials.filter((x) => x.operador.toUpperCase() !== c.operador.toUpperCase()),
            c,
          ],
        })),
      removeCredential: (op) =>
        set((s) => ({
          savedCredentials: s.savedCredentials.filter(
            (c) => c.operador.toUpperCase() !== op.toUpperCase(),
          ),
        })),
      logout: () => set({ session: null }),
    }),
    { name: "delta.auth" },
  ),
);
