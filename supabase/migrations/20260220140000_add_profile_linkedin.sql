-- Add linkedin_url to profiles for sender LinkedIn link in campaign emails
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
