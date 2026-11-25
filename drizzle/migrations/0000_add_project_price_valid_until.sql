ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS price_valid_until DATE NULL;

UPDATE public.projects
SET price_valid_until = '2026-11-30'
WHERE id IN ('18', '19', '22');