-- Webflow Jobs integration config (per-org, configurable for any Webflow instance)
-- Stores site/collection IDs, API token, and optional field mapping
ALTER TABLE public.organization_settings
ADD COLUMN IF NOT EXISTS webflow_site_id TEXT,
ADD COLUMN IF NOT EXISTS webflow_collection_id TEXT,
ADD COLUMN IF NOT EXISTS webflow_api_token TEXT,
ADD COLUMN IF NOT EXISTS webflow_job_field_mapping JSONB;

COMMENT ON COLUMN public.organization_settings.webflow_site_id IS 'Webflow site ID for the jobs CMS';
COMMENT ON COLUMN public.organization_settings.webflow_collection_id IS 'Webflow collection ID for jobs';
COMMENT ON COLUMN public.organization_settings.webflow_api_token IS 'Webflow API token (cms:read scope)';
COMMENT ON COLUMN public.organization_settings.webflow_job_field_mapping IS 'Maps Webflow field names to standard job fields: { "title": "job-title", "department": "department", ... }';
