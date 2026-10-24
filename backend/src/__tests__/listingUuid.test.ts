import { describe, expect, it } from 'vitest';
import { extractListingUuid, listingUuidVariants } from '../utils/listingUuid';

const uid = '9f1c3ad7-d2b6-43e5-b641-eae0f5c9924e';

describe('extractListingUuid', () => {
  it('reads hyphenated ids from acehome, hepihos and prolov URLs', () => {
    expect(extractListingUuid(`https://www.acehome.co.id/project/detail/${uid}`)).toBe(uid);
    expect(extractListingUuid(`https://hepihos.com/project/detail/${uid}?page=cecep-saefulloh`)).toBe(uid);
    expect(extractListingUuid(`https://prolov.id/find/project/${uid}`)).toBe(uid);
  });

  it('normalises Prolov compact 32-char ids', () => {
    expect(extractListingUuid(`https://prolov.id/find/project/${uid.replace(/-/g, '')}`)).toBe(uid);
    expect(extractListingUuid(uid.replace(/-/g, ''))).toBe(uid);
  });

  it('returns null when the URL has no listing id', () => {
    expect(extractListingUuid('https://prolov.id/properti/dijual/bandung')).toBeNull();
    expect(extractListingUuid(null)).toBeNull();
  });
});

describe('listingUuidVariants', () => {
  it('returns hyphenated and compact forms', () => {
    expect(listingUuidVariants(`https://www.acehome.co.id/project/detail/${uid}`)).toEqual([
      uid,
      uid.replace(/-/g, ''),
    ]);
  });
});
