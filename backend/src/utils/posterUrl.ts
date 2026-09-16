/**
 * Converts an absolute server path from sosmed-agent's generated_path
 * into a public URL served via /posters static route.
 *
 * Requires env vars:
 *   POSTER_BASE_DIR  - absolute path to the posters directory
 *   PUBLIC_BASE_URL  - public base URL of this server (e.g. http://localhost:3001)
 */
export function posterPathToUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;

  const baseDir = process.env.POSTER_BASE_DIR;
  const baseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:3001';

  if (!baseDir) return null;

  const normalizedBase = baseDir.endsWith('/') ? baseDir : baseDir + '/';
  const normalizedPath = filePath.startsWith(normalizedBase)
    ? filePath.slice(normalizedBase.length)
    : filePath.startsWith('/') ? filePath.slice(1) : filePath;

  return `${baseUrl}/posters/${normalizedPath}`;
}

/**
 * Recursively walks a posterSpec object and replaces any `generated_path`
 * string values with a public URL.
 */
export function transformPosterSpec(spec: unknown): unknown {
  if (!spec || typeof spec !== 'object') return spec;
  if (Array.isArray(spec)) return spec.map(transformPosterSpec);

  const obj = spec as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (key === 'generated_path' && typeof obj[key] === 'string') {
      result[key] = obj[key]; // keep original
      result['public_url'] = posterPathToUrl(obj[key] as string);
    } else {
      result[key] = transformPosterSpec(obj[key]);
    }
  }

  return result;
}
