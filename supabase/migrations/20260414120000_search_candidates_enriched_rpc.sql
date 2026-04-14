-- Server-side candidate search + duplicate grouping (CRM-wide plan)

CREATE OR REPLACE FUNCTION public.candidate_title_experience_tags(title text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN title ~* '(executive|ceo|cto|cfo|coo|vp|vice president|director|head of)' THEN 'executive' END,
    CASE WHEN title ~* '(lead|principal|architect)' THEN 'lead' END,
    CASE WHEN title ~* '(senior|sr\.?|staff)' THEN 'senior' END,
    CASE WHEN title ~* '(mid|middle|engineer|developer|analyst)' AND title !~* '(senior|lead|principal)' THEN 'mid' END,
    CASE WHEN title ~* '(junior|jr\.?|entry|intern|graduate)' THEN 'entry' END
  ], NULL);
$$;

-- Mirrors client: if "none" is selected, only candidates with no pipelines (ignores other pipeline names).
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
    WHERE
      (p_exclude_ids IS NULL OR NOT (ce.id = ANY (p_exclude_ids)))
      AND (p_scope_candidate_ids IS NULL OR ce.id = ANY (p_scope_candidate_ids))
      AND (
        v_search IS NULL
        OR (
          NOT COALESCE(p_use_websearch, false)
          AND position(lower(v_search) IN lower(concat_ws(' ', ce.first_name, ce.last_name, ce.email, ce.phone, ce.company, ce.title, ce.location, array_to_string(ce.tags, ' ')))) > 0
        )
        OR (
          COALESCE(p_use_websearch, false)
          AND to_tsvector(
            'simple',
            concat_ws(
              ' ',
              ce.first_name,
              ce.last_name,
              ce.email,
              ce.phone,
              ce.company,
              ce.title,
              ce.location,
              array_to_string(ce.tags, ' ')
            )
          ) @@ websearch_to_tsquery('english', v_search)
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

-- Duplicate groups: emails (normalized) and phones (digits, length > 6), same shape for TS merge
CREATE OR REPLACE FUNCTION public.get_candidate_duplicate_groups()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH email_groups AS (
    SELECT
      'email'::text AS match_type,
      array_agg(id ORDER BY created_at) AS ids
    FROM candidates
    WHERE email IS NOT NULL AND trim(email) <> ''
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
  ),
  phone_groups AS (
    SELECT
      'phone'::text AS match_type,
      array_agg(id ORDER BY created_at) AS ids
    FROM candidates
    WHERE length(regexp_replace(coalesce(phone, ''), '\D', '', 'g')) > 6
    GROUP BY regexp_replace(coalesce(phone, ''), '\D', '', 'g')
    HAVING count(*) > 1
  )
  SELECT coalesce(
    jsonb_agg(jsonb_build_object('matchType', match_type, 'ids', ids)),
    '[]'::jsonb
  )
  FROM (
    SELECT * FROM email_groups
    UNION ALL
    SELECT * FROM phone_groups
  ) u;
$$;

GRANT EXECUTE ON FUNCTION public.candidate_title_experience_tags(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_candidates_enriched TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_candidate_duplicate_groups() TO authenticated;
