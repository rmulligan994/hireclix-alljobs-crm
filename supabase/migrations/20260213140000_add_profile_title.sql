-- Add title (job title) to profiles for sender data in campaign emails
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS title TEXT;
