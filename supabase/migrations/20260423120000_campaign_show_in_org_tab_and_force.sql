-- Per-campaign: list this org-shared campaign under Organization (for the owner) when admin "force" is off.
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS show_in_org_tab boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.campaigns.show_in_org_tab IS 'When is_organization_campaign: if profile.force_show_in_org_tab is false, controls whether this campaign appears in the Organization tab for the owner; if force is true, ignored (all org-shared campaigns are listed).';

-- Single admin control: when true, all of the user''s org-shared campaigns appear in Organization; when false, use campaigns.show_in_org_tab per campaign (editable anytime).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS force_show_in_org_tab boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.force_show_in_org_tab IS 'Admin: when true, all org-shared campaigns for this user are listed under Organization; when false, each campaign uses show_in_org_tab.';

-- Migrate from include_my_org_in_org_view
UPDATE public.profiles
SET force_show_in_org_tab = include_my_org_in_org_view
WHERE true;

-- Users who did not list their org campaigns in Organization: mark their org campaigns accordingly
UPDATE public.campaigns c
SET show_in_org_tab = false
FROM public.profiles p
WHERE c.user_id = p.user_id
  AND c.is_organization_campaign = true
  AND p.include_my_org_in_org_view = false;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS include_my_org_in_org_view,
  DROP COLUMN IF EXISTS default_campaign_is_organization;
