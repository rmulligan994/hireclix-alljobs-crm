/** Base URL for API routes (origin + basePath). Works with base path deployments (e.g. /crm). */
export function getApiBase(): string {
  if (typeof window === 'undefined') return '';
  let base = process.env.NEXT_PUBLIC_BASE_URL || '';
  if (!base && typeof window !== 'undefined') {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const first = segments[0];
    const appRoutes = new Set([
      'talent', 'talent-pools', 'pipelines', 'campaigns', 'analytics',
      'integrations', 'settings', 'candidates', 'dashboard', 'jobs', 'reports',
    ]);
    if (first && !appRoutes.has(first) && first !== 'api') {
      base = `/${first}`;
    }
  }
  return `${window.location.origin}${base.startsWith('/') ? base : base ? `/${base}` : ''}`;
}
