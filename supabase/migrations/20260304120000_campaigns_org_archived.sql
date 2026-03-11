-- Add is_organization_campaign and archived_at to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS is_organization_campaign BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.campaigns.is_organization_campaign IS 'When true, visible to all org users. Only admins can set.';
COMMENT ON COLUMN public.campaigns.archived_at IS 'When set, campaign is archived. Null = active in main list.';

-- Update RLS: users can view own campaigns OR organization campaigns
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
CREATE POLICY "Users can view own or org campaigns" ON public.campaigns
  FOR SELECT USING (
    auth.uid() = user_id OR is_organization_campaign = true
  );
