import { db } from '../src/db';
import { listings, leads, followUps, scrapingConfigs, users } from '../src/db/schema';
import { hashPassword } from '../src/services/auth.service';
import { eq } from 'drizzle-orm';

async function seedUser() {
  const email = 'demo@freepropai.com';
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    console.log('Demo user already exists');
    return existing[0];
  }

  const passwordHash = await hashPassword('demo1234');
  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    name: 'Demo Agent',
    phone: '081234567890',
    location: 'Bandung',
    role: 'solo_agent',
    regionScope: 'Bandung Barat',
  }).returning();
  console.log('Created demo user demo@freepropai.com / demo1234');
  return user;
}

async function seedListings() {
  await db.insert(listings).values([
    {
      id: '2c38da00-8292-4749-8485-621578ebaf0c',
      title: 'Rumah 2 Lantai tipe 70/90 di Bandung Barat Botanical View Residence',
      landArea: '90',
      buildingArea: '70',
      location: 'Bandung Barat',
      price: '700000000',
      bedrooms: 2,
      bathrooms: 1,
      propertyType: 'rumah',
      region: 'Bandung Barat',
      sourceUrl: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
      additionalInfo: '"RUMAH BISA DICARI, UNIT TERBAIK BELUM TENTU KEMBALI!"\n*TINGGAL 15 UNIT LAGI! AWAS KEHABISAN!*\n\nLegalitas TERJAMIN • PASTI DIBANGUN • PASTI SELESAI TEPAT WAKTU\n\n*OPEN HOUSE*\nSabtu s/d Minggu | Pukul 09.00 – 17.00 WIB\n\nChat WA: 0877-2261-0091',
      status: 'draft',
    },
    {
      id: '7ee51b5c-680e-4f40-bc6c-3adc8946a2c6',
      title: 'Rumah Minimalis BSD City',
      landArea: '120',
      buildingArea: '90',
      location: 'BSD City, Tangerang Selatan',
      price: '1200000000',
      bedrooms: 3,
      bathrooms: 2,
      propertyType: 'rumah',
      additionalInfo: 'Dekat sekolah, akses tol, cluster aman 24 jam',
      status: 'draft',
    },
    {
      id: '91c92820-e7bd-4e18-af44-92ab443ea3fc',
      title: 'Apartemen Modern South Jakarta',
      landArea: '45',
      buildingArea: '45',
      location: 'Kuningan, Jakarta Selatan',
      price: '850000000',
      bedrooms: 1,
      bathrooms: 1,
      propertyType: 'apartemen',
      additionalInfo: 'Fully furnished, kolam renang, gym, 5 menit ke MRT',
      status: 'published',
    },
    {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      title: 'Ruko 2 Lantai Strategis Pasteur Bandung',
      landArea: '80',
      buildingArea: '160',
      location: 'Pasteur, Bandung',
      price: '2500000000',
      bedrooms: 0,
      bathrooms: 2,
      propertyType: 'ruko',
      region: 'Bandung Utara',
      additionalInfo: 'Cocok untuk kantor atau retail. Parkir luas, dekat tol Pasteur.',
      status: 'published',
    },
    {
      id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
      title: 'Tanah Kavling Siap Bangun Lembang',
      landArea: '200',
      buildingArea: '0',
      location: 'Lembang, Bandung Barat',
      price: '950000000',
      bedrooms: 0,
      bathrooms: 0,
      propertyType: 'tanah',
      region: 'Bandung Barat',
      additionalInfo: 'View gunung, akses paving, SHM pecah.',
      status: 'draft',
    },
  ]).onConflictDoNothing();
}

async function seedLeadsAndFollowUps() {
  await db.insert(leads).values([
    {
      id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      name: 'Budi Santoso',
      phone: '081234567890',
      budgetMin: '800000000',
      budgetMax: '1200000000',
      location: 'Bandung Barat',
      unitType: 'Rumah',
      urgency: 'immediate',
      score: 'Hot',
      rawChatText: 'Halo mas, saya Budi. Cari rumah 3 KT di Bandung Barat budget 800jt-1.2M, butuh cepat bulan ini.',
      status: 'new',
      notes: 'Siap survey weekend',
    },
    {
      id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
      name: 'Siti Rahma',
      phone: '089876543210',
      budgetMin: '500000000',
      budgetMax: '800000000',
      location: 'Cimahi',
      unitType: 'Rumah',
      urgency: 'soon',
      score: 'Warm',
      rawChatText: 'Mau tanya rumah di Cimahi sekitar 500-800jt, KPR ok.',
      status: 'new',
    },
    {
      id: 'e5f6a7b8-c9d0-1234-ef01-345678901234',
      name: 'Andi Wijaya',
      phone: '082198765432',
      budgetMin: '2000000000',
      budgetMax: '3000000000',
      location: 'Pasteur',
      unitType: 'Ruko',
      urgency: 'flexible',
      score: 'Cold',
      rawChatText: 'Cari ruko Pasteur untuk investasi, belum buru-buru.',
      status: 'new',
    },
  ]).onConflictDoNothing();

  await db.insert(followUps).values([
    {
      leadId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      messageDraft: 'Halo Kak Budi, unit di Bandung Barat yang kemarin kita bahas masih available. Bisa survey Sabtu pagi?',
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'pending',
    },
  ]).onConflictDoNothing();
}

async function seedScrapingConfigs() {
  await db.insert(scrapingConfigs).values([
    {
      sourceName: 'acehome',
      baseUrl: 'https://www.acehome.co.id',
      isActive: true,
      scrapingPrompt: 'Extract property listings from acehome.co.id',
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
        listingUrl: 'listingUrl',
        sourceId: 'sourceId',
      },
      rateLimitDelay: 2000,
      maxPages: 10,
      notes: 'Scraping config for acehome.co.id',
    },
    {
      sourceName: 'prolov',
      baseUrl: 'https://prolov.id',
      isActive: true,
      scrapingPrompt: 'Extract property listings from prolov.id',
      fieldMappings: {
        title: 'title',
        price: 'price',
        location: 'location',
        listingUrl: 'listingUrl',
        sourceId: 'sourceId',
      },
      rateLimitDelay: 1500,
      maxPages: 1,
      notes: 'Scraping config for prolov.id',
    },
    {
      sourceName: 'hepihos',
      baseUrl: 'https://hepihos.com',
      isActive: true,
      scrapingPrompt: 'Extract property listings from hepihos.com agent pages',
      fieldMappings: {
        title: 'title',
        price: 'price',
        location: 'location',
        listingUrl: 'listingUrl',
        sourceId: 'sourceId',
      },
      rateLimitDelay: 2000,
      maxPages: 10,
      notes: 'Scraping config for hepihos.com',
    },
  ]).onConflictDoNothing();
}

async function main() {
  console.log('Seeding database...');
  await seedUser();
  await seedListings();
  await seedLeadsAndFollowUps();
  await seedScrapingConfigs();
  console.log('Seeding complete');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
