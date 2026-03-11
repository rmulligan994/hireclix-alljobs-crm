-- Add last_activity_at to candidates_enriched view
-- last_activity_at = max of all recruiter/campaign actions:
-- - candidates.created_at (added to database)
-- - pipeline_candidates.added_at (added to pipeline)
-- - talent_pool_candidates.added_at (added to pool)
-- - communications.occurred_at (emails, calls)
-- - campaign_recipients.sent_at (campaign emails)
-- Used for lead usage stoplight indicator (red/yellow/green)

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
  -- Pipeline associations: resolve stage id to name from pipelines.stages JSONB
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
  -- Last contact: max of communications.occurred_at, campaign_recipients.sent_at
  -- RLS on campaign_recipients filters by campaigns.user_id automatically
  GREATEST(
    (SELECT MAX(comm.occurred_at) FROM communications comm WHERE comm.candidate_id = c.id),
    (SELECT MAX(cr.sent_at) FROM campaign_recipients cr WHERE cr.candidate_id = c.id AND cr.sent_at IS NOT NULL)
  ) AS last_contact_at,
  -- Last activity: max of all recruiter/campaign actions (for lead usage stoplight)
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
  ) AS last_activity_at
FROM candidates c;
