-- Fuzzy name search for global top-bar suggestions (pipelines + campaigns).
-- Uses pg_trgm: similarity + word_similarity + substring boost; SECURITY INVOKER so RLS applies.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS pipelines_name_trgm_idx ON public.pipelines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS campaigns_name_trgm_idx ON public.campaigns USING gin (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_pipelines_campaigns_fuzzy(
  p_query text,
  p_pipeline_limit int DEFAULT 6,
  p_campaign_limit int DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  q text := trim(COALESCE(p_query, ''));
  ql text;
BEGIN
  IF length(q) < 2 THEN
    RETURN jsonb_build_object('pipelines', '[]'::jsonb, 'campaigns', '[]'::jsonb);
  END IF;

  ql := lower(q);

  RETURN jsonb_build_object(
    'pipelines',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('id', id, 'name', name)
          ORDER BY score DESC, updated_at DESC
        )
        FROM (
          SELECT
            id,
            name,
            updated_at,
            GREATEST(
              similarity(lower(name), ql),
              word_similarity(ql, lower(name)),
              CASE WHEN position(ql IN lower(name)) > 0 THEN 0.42 ELSE 0 END
            ) AS score
          FROM pipelines
          WHERE name IS NOT NULL
            AND length(trim(name)) > 0
            AND (
              position(ql IN lower(name)) > 0
              OR similarity(lower(name), ql) > 0.06
              OR word_similarity(ql, lower(name)) > 0.12
            )
          ORDER BY
            GREATEST(
              similarity(lower(name), ql),
              word_similarity(ql, lower(name)),
              CASE WHEN position(ql IN lower(name)) > 0 THEN 0.42 ELSE 0 END
            ) DESC,
            updated_at DESC
          LIMIT p_pipeline_limit
        ) p
      ),
      '[]'::jsonb
    ),
    'campaigns',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object('id', id, 'name', name)
          ORDER BY score DESC, updated_at DESC
        )
        FROM (
          SELECT
            id,
            name,
            updated_at,
            GREATEST(
              similarity(lower(name), ql),
              word_similarity(ql, lower(name)),
              CASE WHEN position(ql IN lower(name)) > 0 THEN 0.42 ELSE 0 END
            ) AS score
          FROM campaigns
          WHERE name IS NOT NULL
            AND length(trim(name)) > 0
            AND (
              position(ql IN lower(name)) > 0
              OR similarity(lower(name), ql) > 0.06
              OR word_similarity(ql, lower(name)) > 0.12
            )
          ORDER BY
            GREATEST(
              similarity(lower(name), ql),
              word_similarity(ql, lower(name)),
              CASE WHEN position(ql IN lower(name)) > 0 THEN 0.42 ELSE 0 END
            ) DESC,
            updated_at DESC
          LIMIT p_campaign_limit
        ) c
      ),
      '[]'::jsonb
    )
  );
END;
$$;

COMMENT ON FUNCTION public.search_pipelines_campaigns_fuzzy(text, int, int) IS
  'Fuzzy search on pipeline and campaign names (trigram + substring). Respects RLS.';

GRANT EXECUTE ON FUNCTION public.search_pipelines_campaigns_fuzzy(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_pipelines_campaigns_fuzzy(text, int, int) TO service_role;
