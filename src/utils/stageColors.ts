/**
 * Centralized stage color mapping for pipeline stages.
 * Use stage.color from pipeline definition when available, else fall back to name-based mapping.
 */
export function getStageColorClass(stageName: string, stageColor?: string | null): string {
  if (stageColor) {
    // Convert hex to Tailwind-compatible classes - use a generic approach for custom colors
    const normalized = stageName.toLowerCase().replace(/\s+/g, ' ');
    if (normalized.includes('not a fit') || normalized === 'not a fit') {
      return 'bg-red-500/20 text-red-500 border-red-500/50';
    }
    // For hex colors we'd need inline styles; use name mapping for consistency
  }

  const name = stageName.toLowerCase().trim();
  switch (name) {
    case 'new':
    case 'sourced':
      return 'bg-muted/50 text-muted-foreground border-muted';
    case 'contacted':
      return 'bg-deep-sea/20 text-sky-blue border-deep-sea';
    case 'screened':
    case 'screening':
    case 'engaged':
      return 'bg-sky-blue/20 text-sky-blue border-sky-blue';
    case 'qualified':
      return 'bg-sunrise/20 text-sunrise border-sunrise';
    case 'submitted':
      return 'bg-green-500/20 text-green-400 border-green-500';
    case 'hired':
      return 'bg-green-600/30 text-green-300 border-green-600';
    case 'not a fit':
      return 'bg-red-500/20 text-red-500 border-red-500/50';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
