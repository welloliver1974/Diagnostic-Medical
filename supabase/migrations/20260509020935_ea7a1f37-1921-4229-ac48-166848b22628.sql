-- Add public token to service_calls for client portal access
ALTER TABLE public.service_calls
  ADD COLUMN IF NOT EXISTS public_token uuid UNIQUE DEFAULT gen_random_uuid();

-- Backfill any existing rows
UPDATE public.service_calls SET public_token = gen_random_uuid() WHERE public_token IS NULL;

ALTER TABLE public.service_calls ALTER COLUMN public_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_calls_public_token ON public.service_calls(public_token);