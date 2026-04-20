import { supabase } from '@/integrations/supabase/client';

/** Strip LIKE wildcards from user input for safe ilike prefix match */
function sanitizePrefix(s: string): string {
  return s.trim().replace(/[%_\\]/g, '');
}

export const tagCatalogService = {
  /**
   * Prefix match on catalog names (case-insensitive). Empty prefix returns [].
   */
  suggestTags: async (prefix: string, limit = 20): Promise<string[]> => {
    const p = sanitizePrefix(prefix);
    if (!p) return [];

    const pattern = `${p}%`;
    const { data, error } = await supabase
      .from('tag_catalog')
      .select('name')
      .ilike('name', pattern)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map((r) => r.name);
  },

  /**
   * Ensure a tag label exists in the catalog (for autocomplete + analytics).
   * Case-insensitive duplicate: no-op. Uses insert + ignore unique violation.
   */
  ensureTagName: async (name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('tag_catalog').insert({ name: trimmed });

    if (error && error.code !== '23505') {
      throw error;
    }
  },
};
