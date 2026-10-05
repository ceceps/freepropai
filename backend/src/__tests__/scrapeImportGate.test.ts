import { describe, it, expect } from 'vitest';
import { isSoldListing, qualifiesForAutoImport } from '../services/scrapeImportGate';

const valid = {
  title: 'Rumah Bandung',
  location: 'Parongpong',
  price: 2000000000,
  imageUrls: ['https://example.com/photo.jpg'],
  sourceUrl: 'https://hepihos.com/project/detail/abc',
};

describe('scrapeImportGate', () => {
  it('accepts an OPEN listing with price, photos, and source URL', () => {
    expect(qualifiesForAutoImport(valid)).toEqual({ ok: true });
  });

  it('rejects missing price, photos, location, title, or source URL', () => {
    expect(qualifiesForAutoImport({ ...valid, price: 0 }).ok).toBe(false);
    expect(qualifiesForAutoImport({ ...valid, imageUrls: [] }).ok).toBe(false);
    expect(qualifiesForAutoImport({ ...valid, location: '' }).ok).toBe(false);
    expect(qualifiesForAutoImport({ ...valid, title: '  ' }).ok).toBe(false);
    expect(qualifiesForAutoImport({ ...valid, sourceUrl: null }).ok).toBe(false);
  });

  it('treats sold / terjual ribbons as ineligible', () => {
    expect(isSoldListing({ ...valid, marketStatus: 'SOLD' })).toBe(true);
    expect(isSoldListing({ ...valid, rawData: { ribbonText: 'Terjual' } })).toBe(true);
    expect(isSoldListing({ ...valid, marketStatus: 'OPEN' })).toBe(false);
    expect(qualifiesForAutoImport({ ...valid, rawData: { marketStatus: 'Sold' } })).toEqual({
      ok: false,
      reason: 'sold',
    });
  });
});
