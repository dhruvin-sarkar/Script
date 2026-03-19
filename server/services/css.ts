export function sanitizeProfileCSS(rawCss: string | null | undefined): string | null {
  if (!rawCss) return null;

  let safeCss = rawCss;

  // Basic substring replacements for explicitly banned items
  safeCss = safeCss.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  safeCss = safeCss.replace(/javascript:/gi, '');
  safeCss = safeCss.replace(/@import/gi, '');

  // Strip external urls in url()
  safeCss = safeCss.replace(/url\(\s*['"]?(https?:|\/\/)[^)]+['"]?\s*\)/gi, 'url()');

  // Prevent fixed/sticky overlays
  safeCss = safeCss.replace(/position\s*:\s*(fixed|sticky)/gi, 'position: absolute');

  // Prevent z-index escaping (strip if > 10 or just strip all for simplicity/security as per requirements)
  // The requirement says "z-index above 10".
  safeCss = safeCss.replace(/z-index\s*:\s*(\d+)/gi, (match, p1) => {
    return parseInt(p1) > 10 ? 'z-index: 10' : match;
  });

  return safeCss;
}
