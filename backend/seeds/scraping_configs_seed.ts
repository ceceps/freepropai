import { db } from '../src/db';
import { scrapingConfigs } from '../src/db/schema';

async function main() {
  console.log('🌱 Seeding scraping configs...');

  await db.insert(scrapingConfigs).values([
    {
      sourceName: 'acehome',
      baseUrl: 'https://www.acehome.co.id',
      isActive: true,
      scrapingPrompt: `
Extract all property listings from this page. For each listing, extract:

Required information:
- Title (judul properti)
- Price (harga dalam Rupiah, convert to number without currency symbols)
- Location (lokasi dengan kota/kabupaten)
- Land area (luas tanah dalam m²)
- Building area (luas bangunan dalam m²)
- Number of bedrooms (jumlah kamar tidur)
- Number of bathrooms (jumlah kamar mandi)
- Property type (tipe properti: rumah, apartemen, ruko, tanah, dll)
- Brief description (deskripsi singkat)
- Image URLs (array of image URLs, at least the main image)
- Contact information (nama, nomor telepon, WhatsApp if available)
- Listing URL (link ke detail listing)
- Property ID or code if visible

Important:
- Convert all prices to numbers (remove "Rp", dots, commas)
- Convert "juta" to 000000, "miliar" to 000000000
- Extract only actual property listings, not ads or banners
- If a field is not available, use null or empty string

Return as JSON array with this exact structure:
[
  {
    "title": "string",
    "price": number,
    "location": "string",
    "landArea": number,
    "buildingArea": number,
    "bedrooms": number,
    "bathrooms": number,
    "propertyType": "string",
    "description": "string",
    "imageUrls": ["string"],
    "contactInfo": {
      "name": "string",
      "phone": "string",
      "whatsapp": "string"
    },
    "listingUrl": "string",
    "sourceId": "string"
  }
]
      `.trim(),
      fieldMappings: {
        title: 'title',
        price: 'price',
        location: 'location',
        landArea: 'landArea',
        buildingArea: 'buildingArea',
        bedrooms: 'bedrooms',
        bathrooms: 'bathrooms',
        propertyType: 'propertyType',
        description: 'description',
        imageUrls: 'imageUrls',
        contactInfo: 'contactInfo',
        listingUrl: 'listingUrl',
        sourceId: 'sourceId',
      },
      rateLimitDelay: 2000,
      maxPages: 10,
      notes: 'Scraping config for acehome.co.id - Indonesia property listings',
    },
  ]).onConflictDoNothing();

  console.log('✅ Scraping configs seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Scraping configs seeding failed:', err);
  process.exit(1);
});