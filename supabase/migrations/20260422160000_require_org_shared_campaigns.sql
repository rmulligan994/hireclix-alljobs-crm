-- When true, user cannot turn off "Share with organization" on new/edited campaigns (set by an admin in Team).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS require_org_shared_campaigns boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.require_org_shared_campaigns IS 'Admin (Team): when true, this user must share every campaign with the organization; private campaigns are not available.';
