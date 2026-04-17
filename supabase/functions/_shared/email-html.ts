/**
 * Extra top spacing so content doesn’t sit flush against the top of the viewport in common clients.
 * Inserts after <body> when present; otherwise prepends a spacer before HTML fragments.
 */
export function prependTopPadding(html: string, px = 24): string {
  const trimmed = html.trim();
  const spacer = `<div style="height:${px}px;line-height:${px}px;font-size:1px;color:transparent" aria-hidden="true">&nbsp;</div>`;
  if (/<body[^>]*>/i.test(trimmed)) {
    return trimmed.replace(/<body([^>]*)>/i, `<body$1>${spacer}`);
  }
  return `${spacer}${trimmed}`;
}
