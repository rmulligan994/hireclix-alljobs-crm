/**
 * Shared copy for candidate search fields (Postgres websearch_to_tsquery + FTS).
 * Keep in sync with search behavior in searchCandidatesRpc / hasBooleanSyntax.
 */

/** Native `title` tooltip on search inputs */
export const CANDIDATE_SEARCH_TOOLTIP =
  'Searches name, title, company, email, phone, location, and tags. Multiple words all apply (AND). ' +
  'Phrases: use quotes, e.g. "site reliability". ' +
  'Exclude a word: put a minus directly in front — e.g. engineer -devops (hyphen + word). ' +
  'The English word NOT is not treated as exclude; use -term. ' +
  'OR: separate options with OR (or |). ' +
  'Examples: python react · "data engineer" -contract · backend OR frontend.';

/** Short placeholder for inputs with limited space */
export const CANDIDATE_SEARCH_PLACEHOLDER =
  'Search name, email, tags… e.g. engineer -devops or "product manager"';
