-- Candidates enriched view: single query for candidate list with pipeline associations and last contact
-- Replaces 5 parallel client queries with one server-side join
-- RLS on underlying tables (candidates, pipeline_candidates, pipelines, communications, campaign_recipients) applies automatically

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
  ) AS last_contact_at
FROM candidates c;

-- Grant select to authenticated users (matches underlying table RLS)
GRANT SELECT ON public.candidates_enriched TO authenticated;
