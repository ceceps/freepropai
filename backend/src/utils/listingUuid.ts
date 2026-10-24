const UUID_PATTERN =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const COMPACT_UUID_PATTERN = /(?:^|\/)([0-9a-f]{32})(?:\?|$)/i;

export function extractListingUuid(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl) return null;
  const hyphenated = sourceUrl.match(UUID_PATTERN);
  if (hyphenated) return hyphenated[1].toLowerCase();
  const compact = sourceUrl.match(COMPACT_UUID_PATTERN);
  if (!compact) return null;
  const hex = compact[1].toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function listingUuidVariants(sourceUrl: string | null | undefined): string[] {
  const uid = extractListingUuid(sourceUrl);
  if (!uid) return [];
  return [uid, uid.replace(/-/g, '')];
}
