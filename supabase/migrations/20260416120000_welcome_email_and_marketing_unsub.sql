-- Career site welcome email (Settings) + candidate marketing unsubscribe for {{unsubscribeLink}} without campaign_recipients

ALTER TABLE public.organization_settings
  ADD COLUMN IF NOT EXISTS welcome_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_email_template_id uuid REFERENCES public.email_templates (id) ON DELETE SET NULL;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS marketing_email_unsubscribed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organization_settings.welcome_email_enabled IS 'When true, new career form candidates receive welcome email from welcome_email_template_id';
COMMENT ON COLUMN public.organization_settings.welcome_email_template_id IS 'Saved email template (html_content) for career site welcome';
COMMENT ON COLUMN public.candidates.marketing_email_unsubscribed IS 'Set when candidate uses unsubscribe?c= link from non-campaign email';

-- Append marketing_email_unsubscribed at the END of the select list only. PostgreSQL CREATE OR REPLACE VIEW
-- cannot insert a column before pipeline_associations (would shift positions and error 42P16).
CREATE OR REPLACE VIEW public.candidates_enriched AS
SELECT
  c.id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company,
  c.title,
  c.location,
  c.source,
  c.tags,
  c.linkedin_url,
  c.avatar_url,
  c.created_at,
  c.updated_at,
  c.created_by,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'stage', COALESCE(
            (
              SELECT elem->>'name'
              FROM jsonb_array_elements(COALESCE(p.stages, '[]'::jsonb)) AS elem
              WHERE elem->>'id' = pc.stage
              LIMIT 1
            ),
            pc.stage
          )
        )
      )
      FROM pipeline_candidates pc
      JOIN pipelines p ON p.id = pc.pipeline_id
      WHERE pc.candidate_id = c.id
    ),
    '[]'::jsonb
  ) AS pipeline_associations,
  GREATEST(
    (SELECT MAX(comm.occurred_at) FROM communications comm WHERE comm.candidate_id = c.id),
    (SELECT MAX(cr.sent_at) FROM campaign_recipients cr WHERE cr.candidate_id = c.id AND cr.sent_at IS NOT NULL)
  ) AS last_contact_at,
  (
    SELECT MAX(dt) FROM (
      SELECT c.created_at AS dt
      UNION ALL
      SELECT pc.added_at FROM pipeline_candidates pc WHERE pc.candidate_id = c.id
      UNION ALL
      SELECT tpc.added_at FROM talent_pool_candidates tpc WHERE tpc.candidate_id = c.id
      UNION ALL
      SELECT comm.occurred_at FROM communications comm WHERE comm.candidate_id = c.id
      UNION ALL
      SELECT cr.sent_at FROM campaign_recipients cr WHERE cr.candidate_id = c.id AND cr.sent_at IS NOT NULL
    ) AS dates
  ) AS last_activity_at,
  c.marketing_email_unsubscribed
FROM candidates c;

GRANT SELECT ON public.candidates_enriched TO authenticated;
