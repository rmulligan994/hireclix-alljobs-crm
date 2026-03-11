-- Campaign folders for organizing campaigns
CREATE TABLE public.campaign_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.campaign_folders(id) ON DELETE SET NULL;

-- RLS for campaign_folders
ALTER TABLE public.campaign_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON public.campaign_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" ON public.campaign_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON public.campaign_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON public.campaign_folders
  FOR DELETE USING (auth.uid() = user_id);
