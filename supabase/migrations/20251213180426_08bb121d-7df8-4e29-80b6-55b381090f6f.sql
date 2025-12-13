-- Add unique constraint for campaign_recipients to prevent duplicates and enable upsert
ALTER TABLE public.campaign_recipients 
ADD CONSTRAINT campaign_recipients_campaign_candidate_unique 
UNIQUE (campaign_id, candidate_id);