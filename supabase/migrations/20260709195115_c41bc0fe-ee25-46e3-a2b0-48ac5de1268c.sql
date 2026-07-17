
-- app_config: singleton com configurações globais (URL da API, nome da empresa)
CREATE TABLE public.app_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  api_base_url TEXT NOT NULL DEFAULT 'http://localhost:3000',
  company_name TEXT NOT NULL DEFAULT 'Minha Empresa',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id = 1)
);
INSERT INTO public.app_config (id) VALUES (1);
GRANT SELECT, INSERT, UPDATE ON public.app_config TO anon, authenticated;
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_config readable by all" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "app_config writable by all" ON public.app_config FOR UPDATE USING (true) WITH CHECK (true);

-- sync_logs: log de chamadas à API externa
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador TEXT,
  rota TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER,
  duration_ms INTEGER,
  ok BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sync_logs_created_at_idx ON public.sync_logs (created_at DESC);
CREATE INDEX sync_logs_ok_idx ON public.sync_logs (ok);
GRANT SELECT, INSERT, DELETE ON public.sync_logs TO anon, authenticated;
GRANT ALL ON public.sync_logs TO service_role;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_logs readable" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "sync_logs insertable" ON public.sync_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "sync_logs deletable" ON public.sync_logs FOR DELETE USING (true);

-- pedidos: pedidos gravados pelos operadores
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL,
  operador TEXT NOT NULL,
  operador_nome TEXT,
  cliente_id TEXT,
  cliente_nome TEXT NOT NULL,
  cliente_diversos BOOLEAN NOT NULL DEFAULT false,
  cliente_data JSONB,
  propriedade_id TEXT,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  forma_pagamento TEXT,
  forma_pagamento_nome TEXT,
  condicao_pagamento TEXT,
  condicao_pagamento_nome TEXT,
  operacao TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  parcelas JSONB DEFAULT '[]'::jsonb,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'gravado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pedidos_operador_idx ON public.pedidos (operador);
CREATE INDEX pedidos_created_at_idx ON public.pedidos (created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO anon, authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos readable" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "pedidos insertable" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "pedidos updatable" ON public.pedidos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pedidos deletable" ON public.pedidos FOR DELETE USING (true);

-- operadores_config: configurações por operador (desconto máximo etc), gerenciado pelo ADM
CREATE TABLE public.operadores_config (
  operador TEXT PRIMARY KEY,
  desconto_maximo NUMERIC(6,2) NOT NULL DEFAULT 5,
  senha TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operadores_config TO anon, authenticated;
GRANT ALL ON public.operadores_config TO service_role;
ALTER TABLE public.operadores_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operadores_config readable" ON public.operadores_config FOR SELECT USING (true);
CREATE POLICY "operadores_config writable" ON public.operadores_config FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER app_config_updated_at BEFORE UPDATE ON public.app_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER operadores_config_updated_at BEFORE UPDATE ON public.operadores_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
