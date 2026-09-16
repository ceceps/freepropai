/**
 * Converts an absolute server path from sosmed-agent's `generated_path`
 * into a URL served by the Express `/posters` static route.
 *
 * Env vars:
 *   POSTER_BASE_DIR  - absolute path to the posters directory (required)
 *   PUBLIC_BASE_URL  - optional public origin of the API. Leave it empty to
 *                      emit a same-origin relative URL, which keeps working
 *                      behind the Vite dev proxy and any reverse proxy.
 */
export function posterPathToUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;

  const baseDir = process.env.POSTER_BASE_DIR;
  if (!baseDir) return null;

  const baseUrl = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
  const relative = filePath.startsWith(normalizedBase)
    ? filePath.slice(normalizedBase.length)
    : filePath.replace(/^\/+/, '');

  return `${baseUrl}/posters/${relative}`;
}

/**
 * Recursively walks a posterSpec object and swaps any `generated_path`
 * filesystem path for a `public_url`. The server path is only kept as a
 * fallback when no public URL can be derived (e.g. POSTER_BASE_DIR unset).
 */
export function transformPosterSpec(spec: unknown): unknown {
  if (!spec || typeof spec !== 'object') return spec;
  if (Array.isArray(spec)) return spec.map(transformPosterSpec);

  const obj = spec as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (key === 'generated_path' && typeof obj[key] === 'string') {
      const url = posterPathToUrl(obj[key] as string);
      if (url) result.public_url = url;
      else result.generated_path = obj[key];
    } else {
      result[key] = transformPosterSpec(obj[key]);
    }
  }

  return result;
}
