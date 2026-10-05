export type AutoImportSkipReason =
  | 'missing_source_url'
  | 'missing_title'
  | 'missing_location'
  | 'missing_price'
  | 'missing_photos'
  | 'sold';

export interface AutoImportCandidate {
  title?: string | null;
  location?: string | null;
  price?: string | number | null;
  imageUrls?: string[] | null;
  sourceUrl?: string | null;
  marketStatus?: string | null;
  description?: string | null;
  rawData?: unknown;
}

const SOLD_PATTERN = /\b(sold|terjual|laku)\b/i;

function collectStatusText(candidate: AutoImportCandidate): string {
  const raw = candidate.rawData;
  const rawBits: string[] = [];
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const key of ['marketStatus', 'ribbonText', 'status', 'title', 'description']) {
      const value = record[key];
      if (typeof value === 'string') rawBits.push(value);
    }
  }
  return [
    candidate.marketStatus,
    candidate.title,
    candidate.description,
    ...rawBits,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' ');
}

export function isSoldListing(candidate: AutoImportCandidate): boolean {
  return SOLD_PATTERN.test(collectStatusText(candidate));
}

export function qualifiesForAutoImport(
  candidate: AutoImportCandidate
): { ok: true } | { ok: false; reason: AutoImportSkipReason } {
  if (!candidate.sourceUrl?.trim()) return { ok: false, reason: 'missing_source_url' };
  if (!candidate.title?.trim()) return { ok: false, reason: 'missing_title' };
  if (!candidate.location?.trim()) return { ok: false, reason: 'missing_location' };
  const price = Number(candidate.price);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, reason: 'missing_price' };
  if (!candidate.imageUrls || candidate.imageUrls.length === 0) {
    return { ok: false, reason: 'missing_photos' };
  }
  if (isSoldListing(candidate)) return { ok: false, reason: 'sold' };
  return { ok: true };
}
