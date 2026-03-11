-- Allow viewing campaign_emails and campaign_recipients for organization campaigns
DROP POLICY IF EXISTS "Users can view campaign emails" ON public.campaign_emails;
CREATE POLICY "Users can view campaign emails" ON public.campaign_emails
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_emails.campaign_id
      AND (c.user_id = auth.uid() OR c.is_organization_campaign = true)
    )
  );

DROP POLICY IF EXISTS "Users can view campaign recipients" ON public.campaign_recipients;
CREATE POLICY "Users can view campaign recipients" ON public.campaign_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_recipients.campaign_id
      AND (c.user_id = auth.uid() OR c.is_organization_campaign = true)
    )
  );
