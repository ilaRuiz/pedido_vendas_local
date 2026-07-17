
CREATE TABLE public.api_cache (
  rota text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  record_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_cache TO anon, authenticated;
GRANT ALL ON public.api_cache TO service_role;

ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_cache readable" ON public.api_cache FOR SELECT USING (true);
CREATE POLICY "api_cache writable" ON public.api_cache FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER api_cache_set_updated_at BEFORE UPDATE ON public.api_cache
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
