import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  estimateMinutes,
  formatSellingPoints,
  generateSellingPoints,
  type NearbyPlace,
} from '../services/sellingPointGenerator.service';

describe('sellingPointGenerator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('estimates travel minutes from distance in meters', () => {
    expect(estimateMinutes(560)).toBe(1);
    expect(estimateMinutes(1400)).toBe(4);
    expect(estimateMinutes(2800)).toBe(7);
  });

  it('formats nearby places as selling-point bullets ordered by distance', () => {
    const places: NearbyPlace[] = [
      { name: 'UPI Bandung', category: 'university', distanceMeters: 2800 },
      { name: 'Setiabudhi Supermarket', category: 'supermarket', distanceMeters: 900 },
      { name: 'Farmhouse Lembang', category: 'tourism', distanceMeters: 6200 },
    ];

    const text = formatSellingPoints('Setiabudi Regency', places);

    expect(text).toContain('Selling Point & Keunggulan:');
    expect(text).toMatch(/Setiabudhi Supermarket/);
    expect(text).toMatch(/UPI Bandung/);
    expect(text.indexOf('Setiabudhi Supermarket')).toBeLessThan(text.indexOf('UPI Bandung'));
    expect(text).toMatch(/±\s*\d+\s*menit/);
  });

  it('geocodes housing complex then returns nearby strategic places', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('nominatim')) {
        return {
          ok: true,
          json: async () => [{ lat: '-6.8625', lon: '107.5964', display_name: 'Setiabudi Regency, Bandung' }],
        } as Response;
      }
      if (url.includes('overpass')) {
        return {
          ok: true,
          json: async () => ({
            elements: [
              { type: 'node', lat: -6.8610, lon: 107.5950, tags: { name: 'UPI Bandung', amenity: 'university' } },
              { type: 'node', lat: -6.8630, lon: 107.5980, tags: { name: 'Borma Toserba', shop: 'supermarket' } },
              { type: 'node', lat: -6.8640, lon: 107.5970, tags: { name: 'RS Advent Bandung', amenity: 'hospital' } },
            ],
          }),
        } as Response;
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await generateSellingPoints(
      { location: 'Setiabudi Regency Bandung' },
      { fetchImpl: fetchMock as unknown as typeof fetch }
    );

    expect(result.coordinates).toEqual({ latitude: -6.8625, longitude: 107.5964 });
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.sellingPoints).toContain('Selling Point & Keunggulan:');
    expect(result.sellingPoints).toMatch(/UPI Bandung|Borma Toserba|RS Advent Bandung/);
    expect(result.sellingPoints).toMatch(/±\s*\d+\s*menit/);
  });

  it('uses provided geotag without calling nominatim', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('nominatim')) {
        throw new Error('nominatim should not be called');
      }
      return {
        ok: true,
        json: async () => ({
          elements: [
            { type: 'node', lat: -6.8620, lon: 107.5970, tags: { name: 'Kolam Renang Setiabudi', leisure: 'swimming_pool' } },
          ],
        }),
      } as Response;
    });

    const result = await generateSellingPoints(
      { location: 'Setiabudi Regency', latitude: -6.8625, longitude: 107.5964 },
      { fetchImpl: fetchMock as unknown as typeof fetch }
    );

    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('nominatim'))).toBe(false);
    expect(result.coordinates.latitude).toBe(-6.8625);
    expect(result.sellingPoints).toContain('Kolam Renang Setiabudi');
  });

  it('throws when location is missing', async () => {
    await expect(generateSellingPoints({ location: '' })).rejects.toThrow(/location/i);
  });
});
