export interface NearbyPlace {
  name: string;
  category: string;
  distanceMeters: number;
}

export interface SellingPointInput {
  location: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface SellingPointResult {
  coordinates: { latitude: number; longitude: number };
  places: NearbyPlace[];
  sellingPoints: string;
}

export interface SellingPointOptions {
  fetchImpl?: typeof fetch;
  radiusMeters?: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'FreePropAI/1.0 (listing-selling-points)';

const CATEGORY_LABELS: Record<string, string> = {
  university: 'kampus',
  school: 'sekolah',
  hospital: 'rumah sakit',
  clinic: 'klinik',
  supermarket: 'supermarket',
  mall: 'mall',
  marketplace: 'pasar',
  tourism: 'wisata',
  park: 'taman',
  swimming_pool: 'kolam renang',
  station: 'stasiun',
  bus_station: 'terminal',
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / 400));
}

function classifyTags(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  if (tags.amenity === 'university' || tags.amenity === 'college') return 'university';
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'clinic') return 'clinic';
  if (tags.amenity === 'marketplace') return 'marketplace';
  if (tags.amenity === 'bus_station') return 'bus_station';
  if (tags.shop === 'supermarket' || tags.shop === 'convenience') return 'supermarket';
  if (tags.shop === 'mall' || tags.shop === 'department_store') return 'mall';
  if (tags.tourism === 'attraction' || tags.tourism === 'theme_park' || tags.tourism === 'viewpoint') {
    return 'tourism';
  }
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park';
  if (tags.leisure === 'swimming_pool') return 'swimming_pool';
  if (tags.railway === 'station' || tags.public_transport === 'station') return 'station';
  return null;
}

function placeName(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  const name = tags.name || tags['name:id'] || tags['name:en'];
  if (!name) return null;
  return name.trim();
}

export function formatSellingPoints(location: string, places: NearbyPlace[]): string {
  const sorted = [...places].sort((a, b) => a.distanceMeters - b.distanceMeters);
  const lines = sorted.slice(0, 8).map((p) => {
    const minutes = estimateMinutes(p.distanceMeters);
    const label = CATEGORY_LABELS[p.category] || p.category;
    return `• ${p.name} (${label}) ±${minutes} menit`;
  });

  const header = location ? `Selling Point & Keunggulan:\nAkses strategis dari ${location}:` : 'Selling Point & Keunggulan:';
  return [header, ...lines].join('\n');
}

async function geocodeLocation(
  location: string,
  fetchImpl: typeof fetch
): Promise<{ latitude: number; longitude: number }> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const res = await fetchImpl(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error('Failed to geocode location');
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Location not found');
  }
  const latitude = parseFloat(data[0].lat);
  const longitude = parseFloat(data[0].lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Location not found');
  }
  return { latitude, longitude };
}

function overpassQuery(lat: number, lon: number, radius: number): string {
  return `[out:json][timeout:25];
(
  node(around:${radius},${lat},${lon})[amenity~"university|college|school|hospital|clinic|marketplace|bus_station"][name];
  node(around:${radius},${lat},${lon})[shop~"supermarket|mall|department_store"][name];
  node(around:${radius},${lat},${lon})[tourism~"attraction|theme_park|viewpoint"][name];
  node(around:${radius},${lat},${lon})[leisure~"park|garden|swimming_pool"][name];
  node(around:${radius},${lat},${lon})[railway=station][name];
  way(around:${radius},${lat},${lon})[amenity~"university|college|hospital"][name];
);
out center 40;`;
}

async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  fetchImpl: typeof fetch
): Promise<NearbyPlace[]> {
  const body = overpassQuery(latitude, longitude, radiusMeters);
  const res = await fetchImpl(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(body)}`,
  });
  if (!res.ok) {
    throw new Error('Failed to fetch nearby places');
  }
  const data = (await res.json()) as {
    elements?: Array<{
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
      tags?: Record<string, string>;
    }>;
  };
  const elements = Array.isArray(data.elements) ? data.elements : [];
  const seen = new Set<string>();
  const places: NearbyPlace[] = [];

  for (const el of elements) {
    const tags = el.tags;
    const name = placeName(tags);
    const category = classifyTags(tags);
    const lat = typeof el.lat === 'number' ? el.lat : el.center?.lat;
    const lon = typeof el.lon === 'number' ? el.lon : el.center?.lon;
    if (!name || !category || typeof lat !== 'number' || typeof lon !== 'number') continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      name,
      category,
      distanceMeters: Math.round(haversineMeters(latitude, longitude, lat, lon)),
    });
  }

  places.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return places.slice(0, 8);
}

export async function generateSellingPoints(
  input: SellingPointInput,
  options: SellingPointOptions = {}
): Promise<SellingPointResult> {
  const location = (input.location || '').trim();
  if (!location) {
    throw new Error('Location is required');
  }

  const fetchImpl = options.fetchImpl || fetch;
  const radiusMeters = options.radiusMeters ?? 5000;

  let latitude = toNumber(input.latitude);
  let longitude = toNumber(input.longitude);

  if (latitude === null || longitude === null) {
    const geo = await geocodeLocation(location, fetchImpl);
    latitude = geo.latitude;
    longitude = geo.longitude;
  }

  const places = await fetchNearbyPlaces(latitude, longitude, radiusMeters, fetchImpl);
  const sellingPoints = formatSellingPoints(location, places);

  return {
    coordinates: { latitude, longitude },
    places,
    sellingPoints,
  };
}

export default { generateSellingPoints, formatSellingPoints, estimateMinutes, haversineMeters };
