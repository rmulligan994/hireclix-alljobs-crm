-- User preferences for campaign defaults and Organization tab visibility
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_campaign_is_organization BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS include_my_org_in_org_view BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.default_campaign_is_organization IS 'When true, new campaigns default to Share with organization (admins can change per campaign).';
COMMENT ON COLUMN public.profiles.include_my_org_in_org_view IS 'When true, Organization tab also lists your own org-shared campaigns, grouped under you.';
