-- Add role to profiles for Recruiter/Admin
-- Admin: full access, higher campaign limits
-- Recruiter: standard access, lower campaign limits

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'recruiter' CHECK (role IN ('admin', 'recruiter'));

-- Set first user (oldest by created_at) as admin for backward compatibility
UPDATE public.profiles
SET role = 'admin'
WHERE user_id = (SELECT user_id FROM public.profiles ORDER BY created_at ASC LIMIT 1);

COMMENT ON COLUMN public.profiles.role IS 'User role: admin (full access) or recruiter (limited campaign recipients)';
