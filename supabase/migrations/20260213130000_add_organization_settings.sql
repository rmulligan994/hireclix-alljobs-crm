-- Organization settings (instance-wide: company, brand)
-- Used for sender merge tags in campaign emails
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  brand_name TEXT,
  base_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default row if table is empty
INSERT INTO public.organization_settings (company_name, brand_name, base_url)
SELECT NULL, NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.organization_settings LIMIT 1);

-- Add company and phone to profiles for sender data
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Enable RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/update org settings
CREATE POLICY "Authenticated users can view organization settings"
  ON public.organization_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert organization settings"
  ON public.organization_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update organization settings"
  ON public.organization_settings FOR UPDATE TO authenticated USING (true);
