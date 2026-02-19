-- Career site base URL for View links (slug + base URL = career site page)
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS career_site_base_url TEXT;

COMMENT ON COLUMN public.organization_settings.career_site_base_url IS 'Base URL for career site job pages (e.g. https://careers.example.com). View link = base_url + / + slug';
