import { asc, eq, ilike, inArray, or } from 'drizzle-orm';
import { db, listings } from '../db';
import { extractListingUuid, listingUuidVariants } from './listingUuid';

export type ImportedListing = { id: string; importedAt: Date | null };

function uuidMatchConditions(sourceUrl: string) {
  return listingUuidVariants(sourceUrl).map((variant) =>
    ilike(listings.sourceUrl, `%${variant}%`)
  );
}

export async function findListingBySourceIdentity(
  sourceUrl: string | null | undefined
): Promise<{ id: string; title: string; sourceUrl: string | null; createdAt: Date | null } | null> {
  if (!sourceUrl) return null;

  const conditions = [eq(listings.sourceUrl, sourceUrl), ...uuidMatchConditions(sourceUrl)];
  const [row] = await db
    .select({
      id: listings.id,
      title: listings.title,
      sourceUrl: listings.sourceUrl,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(or(...conditions))
    .orderBy(asc(listings.createdAt), asc(listings.id))
    .limit(1);

  return row ?? null;
}

export async function resolveImportedListings(
  sourceUrls: (string | null)[]
): Promise<Map<string, ImportedListing>> {
  const urls = [...new Set(sourceUrls.filter((url): url is string => Boolean(url)))];
  const imported = new Map<string, ImportedListing>();
  if (urls.length === 0) return imported;

  const exactRows = await db
    .select({ id: listings.id, sourceUrl: listings.sourceUrl, createdAt: listings.createdAt })
    .from(listings)
    .where(inArray(listings.sourceUrl, urls));

  for (const row of exactRows) {
    if (row.sourceUrl && !imported.has(row.sourceUrl)) {
      imported.set(row.sourceUrl, { id: row.id, importedAt: row.createdAt ?? null });
    }
  }

  const unmatched = urls.filter((url) => !imported.has(url));
  const uuidConditions = unmatched.flatMap(uuidMatchConditions);
  if (uuidConditions.length === 0) return imported;

  const uuidRows = await db
    .select({ id: listings.id, sourceUrl: listings.sourceUrl, createdAt: listings.createdAt })
    .from(listings)
    .where(or(...uuidConditions));

  for (const url of unmatched) {
    const uid = extractListingUuid(url);
    if (!uid) continue;
    const compact = uid.replace(/-/g, '');
    const match = uuidRows.find((row) => {
      const stored = row.sourceUrl?.toLowerCase() ?? '';
      return stored.includes(uid) || stored.includes(compact);
    });
    if (match) {
      imported.set(url, { id: match.id, importedAt: match.createdAt ?? null });
    }
  }

  return imported;
}
