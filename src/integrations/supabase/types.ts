export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_cache: {
        Row: {
          data: Json
          record_count: number
          rota: string
          updated_at: string
        }
        Insert: {
          data?: Json
          record_count?: number
          rota: string
          updated_at?: string
        }
        Update: {
          data?: Json
          record_count?: number
          rota?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          api_base_url: string
          company_name: string
          id: number
          updated_at: string
        }
        Insert: {
          api_base_url?: string
          company_name?: string
          id?: number
          updated_at?: string
        }
        Update: {
          api_base_url?: string
          company_name?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      operadores_config: {
        Row: {
          desconto_maximo: number
          operador: string
          senha: string | null
          updated_at: string
        }
        Insert: {
          desconto_maximo?: number
          operador: string
          senha?: string | null
          updated_at?: string
        }
        Update: {
          desconto_maximo?: number
          operador?: string
          senha?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          acrescimo: number
          cliente_data: Json | null
          cliente_diversos: boolean
          cliente_id: string | null
          cliente_nome: string
          condicao_pagamento: string | null
          condicao_pagamento_nome: string | null
          created_at: string
          desconto: number
          forma_pagamento: string | null
          forma_pagamento_nome: string | null
          id: string
          itens: Json
          numero: number
          observacao: string | null
          operacao: string | null
          operador: string
          operador_nome: string | null
          parcelas: Json | null
          propriedade_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          acrescimo?: number
          cliente_data?: Json | null
          cliente_diversos?: boolean
          cliente_id?: string | null
          cliente_nome: string
          condicao_pagamento?: string | null
          condicao_pagamento_nome?: string | null
          created_at?: string
          desconto?: number
          forma_pagamento?: string | null
          forma_pagamento_nome?: string | null
          id?: string
          itens?: Json
          numero?: number
          observacao?: string | null
          operacao?: string | null
          operador: string
          operador_nome?: string | null
          parcelas?: Json | null
          propriedade_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          acrescimo?: number
          cliente_data?: Json | null
          cliente_diversos?: boolean
          cliente_id?: string | null
          cliente_nome?: string
          condicao_pagamento?: string | null
          condicao_pagamento_nome?: string | null
          created_at?: string
          desconto?: number
          forma_pagamento?: string | null
          forma_pagamento_nome?: string | null
          id?: string
          itens?: Json
          numero?: number
          observacao?: string | null
          operacao?: string | null
          operador?: string
          operador_nome?: string | null
          parcelas?: Json | null
          propriedade_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          method: string
          ok: boolean
          operador: string | null
          payload: Json | null
          rota: string
          status_code: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          method?: string
          ok?: boolean
          operador?: string | null
          payload?: Json | null
          rota: string
          status_code?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          method?: string
          ok?: boolean
          operador?: string | null
          payload?: Json | null
          rota?: string
          status_code?: number | null
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          last_error: string | null
          last_ok: boolean
          last_sync_at: string | null
          record_count: number
          rota: string
          updated_at: string
        }
        Insert: {
          last_error?: string | null
          last_ok?: boolean
          last_sync_at?: string | null
          record_count?: number
          rota: string
          updated_at?: string
        }
        Update: {
          last_error?: string | null
          last_ok?: boolean
          last_sync_at?: string | null
          record_count?: number
          rota?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
