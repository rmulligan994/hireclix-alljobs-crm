-- Allow admins to update any profile (for role management in Settings > Team)
-- Existing policy "Users can update their own profile" remains for self-updates

CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );
