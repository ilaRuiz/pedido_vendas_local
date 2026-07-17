
CREATE TABLE public.sync_state (
  rota text PRIMARY KEY,
  last_sync_at timestamptz,
  record_count integer NOT NULL DEFAULT 0,
  last_ok boolean NOT NULL DEFAULT false,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_state TO anon, authenticated;
GRANT ALL ON public.sync_state TO service_role;

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_state readable" ON public.sync_state FOR SELECT USING (true);
CREATE POLICY "sync_state writable" ON public.sync_state FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER sync_state_set_updated_at BEFORE UPDATE ON public.sync_state
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
