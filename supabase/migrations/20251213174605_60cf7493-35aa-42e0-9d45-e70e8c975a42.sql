-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'draft',
  goal TEXT,
  audience_filter JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_emails table (sequence steps)
CREATE TABLE public.campaign_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  subject TEXT NOT NULL,
  bee_json JSONB,
  html_content TEXT,
  email_template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_recipients table
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, candidate_id)
);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Campaign emails policies (access through campaign ownership)
CREATE POLICY "Users can view campaign emails" ON public.campaign_emails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_emails.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can create campaign emails" ON public.campaign_emails
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_emails.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can update campaign emails" ON public.campaign_emails
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_emails.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can delete campaign emails" ON public.campaign_emails
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_emails.campaign_id AND campaigns.user_id = auth.uid())
  );

-- Campaign recipients policies
CREATE POLICY "Users can view campaign recipients" ON public.campaign_recipients
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_recipients.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can add campaign recipients" ON public.campaign_recipients
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_recipients.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can update campaign recipients" ON public.campaign_recipients
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_recipients.campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can delete campaign recipients" ON public.campaign_recipients
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_recipients.campaign_id AND campaigns.user_id = auth.uid())
  );

-- Add updated_at triggers
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_emails_updated_at
  BEFORE UPDATE ON public.campaign_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();