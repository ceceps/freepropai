import { db } from '../src/db';
import { listings } from '../src/db/schema';

async function main() {
  console.log('🌱 Seeding database...');

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
      additionalInfo: '"RUMAH BISA DICARI, UNIT TERBAIK BELUM TENTU KEMBALI!"\n*TINGGAL 15 UNIT LAGI! AWAS KEHABISAN!*\n\nLegalitas TERJAMIN • PASTI DIBANGUN • PASTI SELESAI TEPAT WAKTU\n\n*OPEN HOUSE*\nSabtu s/d Minggu | Pukul 09.00 – 17.00 WIB\n\n🌿 Hunian Modern Bernuansa Villa dengan Udara Sejuk & Rumah Berkabut di 867 MDPL.\n📍1 Menit ke Kantor DPRD Bandung Barat\n🚄 7 Menit ke Stasiun KCIC Padalarang\n🛣 9 Menit ke Tol Padalarang\n🛍 10 Menit ke IKEA Kota Baru Parahyangan\n⛰ 30 Menit ke Lembang\n\nChat WA: 0877-2261-0091',
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
  ]).onConflictDoNothing();

  console.log('✅ Seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
