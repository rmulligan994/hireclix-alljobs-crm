-- Candidate search performance: precomputed tsvector + GIN, supporting indexes, FTS in RPC.
-- Simple search uses plainto_tsquery (word tokens) instead of substring ILIKE-style scans.

-- 1) search_vector column (trigger-maintained: to_tsvector is STABLE, not IMMUTABLE, so GENERATED STORED is invalid)
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.candidates_search_vector_refresh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'english',
    concat_ws(
      ' ',
      coalesce(NEW.first_name, ''),
      coalesce(NEW.last_name, ''),
      coalesce(NEW.email, ''),
      coalesce(NEW.phone, ''),
      coalesce(NEW.company, ''),
      coalesce(NEW.title, ''),
      coalesce(NEW.location, ''),
      coalesce(array_to_string(NEW.tags, ' '), '')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidates_search_vector_trg ON public.candidates;
CREATE TRIGGER candidates_search_vector_trg
  BEFORE INSERT OR UPDATE OF first_name, last_name, email, phone, company, title, location, tags
  ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.candidates_search_vector_refresh();

UPDATE public.candidates c
SET search_vector = to_tsvector(
  'english',
  concat_ws(
    ' ',
    coalesce(c.first_name, ''),
    coalesce(c.last_name, ''),
    coalesce(c.email, ''),
    coalesce(c.phone, ''),
    coalesce(c.company, ''),
    coalesce(c.title, ''),
    coalesce(c.location, ''),
    coalesce(array_to_string(c.tags, ' '), '')
  )
)
WHERE search_vector IS NULL;

ALTER TABLE public.candidates
  ALTER COLUMN search_vector SET NOT NULL;

COMMENT ON COLUMN public.candidates.search_vector IS 'Precomputed FTS document for search_candidates_enriched; maintained by trigger.';

CREATE INDEX IF NOT EXISTS idx_candidates_search_vector_gin
  ON public.candidates USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_candidates_created_at_desc
  ON public.candidates (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candidates_tags_gin
  ON public.candidates USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_pipeline_candidates_candidate_id
  ON public.pipeline_candidates (candidate_id);

CREATE INDEX IF NOT EXISTS idx_talent_pool_candidates_candidate_id
  ON public.talent_pool_candidates (candidate_id);

-- 2) Refresh enriched view (same shape as before; search_vector stays on candidates only)
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
  ) AS last_activity_at
FROM candidates c;

GRANT SELECT ON public.candidates_enriched TO authenticated;

ANALYZE public.candidates;

-- 3) RPC: filter via candidates.search_vector (join); row payloads unchanged
CREATE OR REPLACE FUNCTION public.search_candidates_enriched(
  p_search text DEFAULT NULL,
  p_use_websearch boolean DEFAULT false,
  p_exclude_ids uuid[] DEFAULT NULL,
  p_adv_name text DEFAULT NULL,
  p_adv_email text DEFAULT NULL,
  p_adv_phone text DEFAULT NULL,
  p_adv_company text DEFAULT NULL,
  p_adv_title text DEFAULT NULL,
  p_adv_location text DEFAULT NULL,
  p_adv_skills text[] DEFAULT NULL,
  p_adv_date_added_from timestamptz DEFAULT NULL,
  p_adv_date_added_to timestamptz DEFAULT NULL,
  p_adv_last_contact_from timestamptz DEFAULT NULL,
  p_adv_last_contact_to timestamptz DEFAULT NULL,
  p_filter_skills text[] DEFAULT NULL,
  p_filter_locations text[] DEFAULT NULL,
  p_filter_sources text[] DEFAULT NULL,
  p_filter_companies text[] DEFAULT NULL,
  p_filter_pipelines text[] DEFAULT NULL,
  p_filter_pipeline_stages text[] DEFAULT NULL,
  p_filter_talent_pool_names text[] DEFAULT NULL,
  p_filter_experience_levels text[] DEFAULT NULL,
  p_filter_date_added_from timestamptz DEFAULT NULL,
  p_filter_date_added_to timestamptz DEFAULT NULL,
  p_filter_last_contact_never boolean DEFAULT NULL,
  p_filter_last_contact_from timestamptz DEFAULT NULL,
  p_filter_last_contact_to timestamptz DEFAULT NULL,
  p_scope_candidate_ids uuid[] DEFAULT NULL,
  p_sort text DEFAULT 'recently_added',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_include_all_if_under int DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_rows jsonb;
  v_all_rows jsonb;
  v_sort text;
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
  v_adv_name text := NULLIF(trim(COALESCE(p_adv_name, '')), '');
  v_adv_email text := NULLIF(trim(COALESCE(p_adv_email, '')), '');
  v_adv_phone text := NULLIF(regexp_replace(COALESCE(p_adv_phone, ''), '\D', '', 'g'), '');
  v_adv_company text := NULLIF(trim(COALESCE(p_adv_company, '')), '');
  v_adv_title text := NULLIF(trim(COALESCE(p_adv_title, '')), '');
  v_adv_location text := NULLIF(trim(COALESCE(p_adv_location, '')), '');
BEGIN
  v_sort := CASE COALESCE(p_sort, 'recently_added')
    WHEN 'name_asc' THEN 'name_asc'
    WHEN 'name_desc' THEN 'name_desc'
    WHEN 'recently_added' THEN 'recently_added'
    WHEN 'oldest_first' THEN 'oldest_first'
    WHEN 'last_contacted_recent' THEN 'last_contacted_recent'
    WHEN 'last_contacted_oldest' THEN 'last_contacted_oldest'
    WHEN 'last_updated' THEN 'last_updated'
    ELSE 'recently_added'
  END;

  WITH base AS (
    SELECT ce.*
    FROM public.candidates_enriched ce
    INNER JOIN public.candidates cand ON cand.id = ce.id
    WHERE
      (p_exclude_ids IS NULL OR NOT (ce.id = ANY (p_exclude_ids)))
      AND (p_scope_candidate_ids IS NULL OR ce.id = ANY (p_scope_candidate_ids))
      AND (
        v_search IS NULL
        OR (
          NOT COALESCE(p_use_websearch, false)
          AND cand.search_vector @@ plainto_tsquery('english', v_search)
        )
        OR (
          COALESCE(p_use_websearch, false)
          AND cand.search_vector @@ websearch_to_tsquery('english', v_search)
        )
      )
      AND (
        v_adv_name IS NULL
        OR position(lower(v_adv_name) IN lower(concat_ws(' ', ce.first_name, ce.last_name))) > 0
      )
      AND (v_adv_email IS NULL OR position(lower(v_adv_email) IN lower(coalesce(ce.email, ''))) > 0)
      AND (
        v_adv_phone IS NULL
        OR v_adv_phone = ''
        OR position(v_adv_phone IN regexp_replace(coalesce(ce.phone, ''), '\D', '', 'g')) > 0
      )
      AND (v_adv_company IS NULL OR position(lower(v_adv_company) IN lower(coalesce(ce.company, ''))) > 0)
      AND (v_adv_title IS NULL OR position(lower(v_adv_title) IN lower(coalesce(ce.title, ''))) > 0)
      AND (v_adv_location IS NULL OR position(lower(v_adv_location) IN lower(coalesce(ce.location, ''))) > 0)
      AND (
        p_adv_skills IS NULL
        OR cardinality(p_adv_skills) = 0
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p_adv_skills) AS s(skill)
          WHERE NOT EXISTS (
            SELECT 1
            FROM unnest(coalesce(ce.tags, ARRAY[]::text[])) AS t(tag)
            WHERE lower(tag) = lower(skill)
          )
        )
      )
      AND (p_adv_date_added_from IS NULL OR ce.created_at >= p_adv_date_added_from)
      AND (p_adv_date_added_to IS NULL OR ce.created_at <= p_adv_date_added_to)
      AND (
        p_adv_last_contact_from IS NULL
        OR (ce.last_contact_at IS NOT NULL AND ce.last_contact_at >= p_adv_last_contact_from)
      )
      AND (
        p_adv_last_contact_to IS NULL
        OR (ce.last_contact_at IS NOT NULL AND ce.last_contact_at <= p_adv_last_contact_to)
      )
      AND (
        p_filter_skills IS NULL
        OR cardinality(p_filter_skills) = 0
        OR ce.tags && p_filter_skills
      )
      AND (
        p_filter_locations IS NULL
        OR cardinality(p_filter_locations) = 0
        OR ce.location = ANY (p_filter_locations)
      )
      AND (
        p_filter_sources IS NULL
        OR cardinality(p_filter_sources) = 0
        OR ce.source = ANY (p_filter_sources)
      )
      AND (
        p_filter_companies IS NULL
        OR cardinality(p_filter_companies) = 0
        OR ce.company = ANY (p_filter_companies)
      )
      AND (
        p_filter_pipelines IS NULL
        OR cardinality(p_filter_pipelines) = 0
        OR (
          ('none' = ANY (p_filter_pipelines)
            AND jsonb_array_length(coalesce(ce.pipeline_associations, '[]'::jsonb)) = 0)
          OR (
            NOT ('none' = ANY (p_filter_pipelines))
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(coalesce(ce.pipeline_associations, '[]'::jsonb)) AS elem
              WHERE (elem->>'name') = ANY (
                ARRAY(SELECT x FROM unnest(p_filter_pipelines) AS t(x) WHERE t.x IS DISTINCT FROM 'none')
              )
            )
          )
        )
      )
      AND (
        p_filter_pipeline_stages IS NULL
        OR cardinality(p_filter_pipeline_stages) = 0
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(coalesce(ce.pipeline_associations, '[]'::jsonb)) AS elem
          WHERE (elem->>'stage') = ANY (p_filter_pipeline_stages)
        )
      )
      AND (
        p_filter_talent_pool_names IS NULL
        OR cardinality(p_filter_talent_pool_names) = 0
        OR EXISTS (
          SELECT 1
          FROM public.talent_pool_candidates tpc
          JOIN public.talent_pools tp ON tp.id = tpc.talent_pool_id
          WHERE tpc.candidate_id = ce.id
            AND tp.name = ANY (p_filter_talent_pool_names)
        )
      )
      AND (
        p_filter_experience_levels IS NULL
        OR cardinality(p_filter_experience_levels) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest(p_filter_experience_levels) AS fl(lvl)
          WHERE fl.lvl = ANY (public.candidate_title_experience_tags(coalesce(ce.title, '')))
        )
      )
      AND (p_filter_date_added_from IS NULL OR ce.created_at >= p_filter_date_added_from)
      AND (p_filter_date_added_to IS NULL OR ce.created_at <= p_filter_date_added_to)
      AND (
        p_filter_last_contact_never IS DISTINCT FROM true
        OR ce.last_contact_at IS NULL
      )
      AND (
        p_filter_last_contact_from IS NULL
        OR (ce.last_contact_at IS NOT NULL AND ce.last_contact_at >= p_filter_last_contact_from)
      )
      AND (
        p_filter_last_contact_to IS NULL
        OR (ce.last_contact_at IS NOT NULL AND ce.last_contact_at <= p_filter_last_contact_to)
      )
  ),
  ordered AS (
    SELECT b.*
    FROM base b
    ORDER BY
      CASE v_sort
        WHEN 'name_asc' THEN lower(concat_ws(' ', b.first_name, b.last_name))
      END ASC NULLS LAST,
      CASE v_sort
        WHEN 'name_desc' THEN lower(concat_ws(' ', b.first_name, b.last_name))
      END DESC NULLS LAST,
      CASE v_sort
        WHEN 'recently_added' THEN extract(epoch FROM b.created_at)
      END DESC NULLS LAST,
      CASE v_sort
        WHEN 'oldest_first' THEN extract(epoch FROM b.created_at)
      END ASC NULLS LAST,
      CASE v_sort
        WHEN 'last_contacted_recent' THEN extract(epoch FROM b.last_contact_at)
      END DESC NULLS LAST,
      CASE v_sort
        WHEN 'last_contacted_oldest' THEN extract(epoch FROM b.last_contact_at)
      END ASC NULLS LAST,
      CASE v_sort
        WHEN 'last_updated' THEN extract(epoch FROM b.updated_at)
      END DESC NULLS LAST,
      b.id
  ),
  stats AS (
    SELECT count(*)::bigint AS n FROM base
  )
  SELECT
    s.n,
    (SELECT coalesce(
      jsonb_agg(row_to_json(c)::jsonb ORDER BY
        CASE v_sort
          WHEN 'name_asc' THEN lower(concat_ws(' ', c.first_name, c.last_name))
        END ASC NULLS LAST,
        CASE v_sort
          WHEN 'name_desc' THEN lower(concat_ws(' ', c.first_name, c.last_name))
        END DESC NULLS LAST,
        CASE v_sort
          WHEN 'recently_added' THEN extract(epoch FROM c.created_at)
        END DESC NULLS LAST,
        CASE v_sort
          WHEN 'oldest_first' THEN extract(epoch FROM c.created_at)
        END ASC NULLS LAST,
        CASE v_sort
          WHEN 'last_contacted_recent' THEN extract(epoch FROM c.last_contact_at)
        END DESC NULLS LAST,
        CASE v_sort
          WHEN 'last_contacted_oldest' THEN extract(epoch FROM c.last_contact_at)
        END ASC NULLS LAST,
        CASE v_sort
          WHEN 'last_updated' THEN extract(epoch FROM c.updated_at)
        END DESC NULLS LAST,
        c.id
      ),
      '[]'::jsonb
    )
    FROM (
      SELECT * FROM ordered
      LIMIT greatest(COALESCE(p_limit, 50), 1)
      OFFSET greatest(COALESCE(p_offset, 0), 0)
    ) c),
    CASE
      WHEN COALESCE(p_offset, 0) = 0
        AND s.n <= COALESCE(p_include_all_if_under, 500)
        AND s.n > 0
      THEN (
        SELECT coalesce(
          jsonb_agg(row_to_json(c)::jsonb ORDER BY
            CASE v_sort
              WHEN 'name_asc' THEN lower(concat_ws(' ', c.first_name, c.last_name))
            END ASC NULLS LAST,
            CASE v_sort
              WHEN 'name_desc' THEN lower(concat_ws(' ', c.first_name, c.last_name))
            END DESC NULLS LAST,
            CASE v_sort
              WHEN 'recently_added' THEN extract(epoch FROM c.created_at)
            END DESC NULLS LAST,
            CASE v_sort
              WHEN 'oldest_first' THEN extract(epoch FROM c.created_at)
            END ASC NULLS LAST,
            CASE v_sort
              WHEN 'last_contacted_recent' THEN extract(epoch FROM c.last_contact_at)
            END DESC NULLS LAST,
            CASE v_sort
              WHEN 'last_contacted_oldest' THEN extract(epoch FROM c.last_contact_at)
            END ASC NULLS LAST,
            CASE v_sort
              WHEN 'last_updated' THEN extract(epoch FROM c.updated_at)
            END DESC NULLS LAST,
            c.id
          ),
          '[]'::jsonb
        )
        FROM ordered c
      )
      ELSE NULL
    END
  INTO v_total, v_rows, v_all_rows
  FROM stats s;

  RETURN jsonb_build_object(
    'total', v_total,
    'rows', coalesce(v_rows, '[]'::jsonb),
    'all_rows', v_all_rows
  );
END;
$$;
