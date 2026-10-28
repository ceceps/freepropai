import { describe, it, expect, vi } from 'vitest';
import descriptionGeneratorService from '../services/descriptionGenerator.service';
import type { Listing } from '../types';

describe('DescriptionGeneratorService Unit Tests', () => {
  const sampleListing: Listing = {
    id: 'e0d4b91e-6f6e-4cdb-b488-a4355e63c6c5',
    title: 'Rumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol',
    land_area: 72,
    building_area: 100,
    location: 'Ngamprah Bandung Barat',
    price: 975000000,
    bedrooms: 3,
    bathrooms: 2,
    property_type: 'rumah',
    status: 'available',
    additional_info: `Harga: Rp975.000.000\nDetail:\nLuas Tanah: 72.00 m²\nLuas Bangunan: 100.00 m²\nKamar Tidur: 3\nKamar Mandi: 2\nDeskripsi:\nRumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol\nSpesifikasi:\n- Type Alocasia custom 100/72\n- 2 lantai\n- 3 kamar tidur\n- 2 kamar mandi\n- Dapur\n- Ruang keluarga\n- Carport\n- Halaman belakang\n- Rooftop\nPromo: Harga 975 juta nego\nSelling Point:\n- Lokasi sangat strategis dekat KCIC whoosh dan gerbang tol Padalarang dekat wisata Lembang\n- Dekat kantor Bupati KBB dan kantor DPRD KBB\nCARA BAYAR : CASH DAN KPR\nAKSES LOKASI : 2 MOBIL\nSURVEY : JANJIAN SATU HARI SEBELUMNYA`,
    source_url: 'https://www.acehome.co.id/project/detail/9f1c3ad7-d2b6-43e5-b641-eae0f5c9924e',
    created_at: new Date(),
    updated_at: new Date(),
  };

  it('should generate fallback descriptions matching required 3 variants when LLM fails or is offline', async () => {
    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);

    expect(result).toHaveProperty('formal');
    expect(result).toHaveProperty('pas');
    expect(result).toHaveProperty('short');

    expect(result.formal).toContain('Rumah di Ngamprah Bandung Barat');
    expect(result.formal).toContain('Rp975 Juta');
    expect(result.formal).toContain('Spesifikasi:');
    expect(result.formal).not.toMatch(/\p{Extended_Pictographic}/u);

    expect(result.pas).toContain('Ngamprah Bandung Barat');
    expect(result.pas).toContain('Rp975 Juta');

    expect(result.short).toContain('Ngamprah Bandung Barat');
    expect(result.short).toContain('Rp975 Juta');
  });

  it('strips markdown bold markers from all description variants', async () => {
    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);

    expect(result.formal).not.toMatch(/\*\*/);
    expect(result.pas).not.toMatch(/\*\*/);
    expect(result.short).not.toMatch(/\*\*/);
  });

  it('writes PAS copy in Marketing 2.0-4.0 voice instead of stiff spec dump', async () => {
    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);

    expect(result.pas).not.toMatch(/^\s*-\s*Spesifikasi:/m);
    expect(result.pas).not.toMatch(/Lagi cari hunian strategis/);
    expect(result.pas).toMatch(/kamu|kita|rumah yang|pagi|pulang|keluarga|weekend|cerita|hidup/i);
  });

  it('writes Short copy in Marketing 2.0-4.0 voice instead of stiff caption template', async () => {
    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);

    expect(result.short).not.toMatch(/Klik link di bio & hubungi kami untuk survey/i);
    expect(result.short).toMatch(/kamu|cerita|pulang|pagi|DM|chat|survey/i);
  });

  it('instructs the LLM to strip markdown and write PAS/Short in Marketing 2.0-4.0 voice', () => {
    const buildSystemPrompt = (descriptionGeneratorService as any).buildSystemPrompt.bind(descriptionGeneratorService);
    const buildUserPrompt = (descriptionGeneratorService as any).buildUserPrompt.bind(descriptionGeneratorService);
    const systemPrompt = buildSystemPrompt(sampleListing);
    const userPrompt = buildUserPrompt(sampleListing);

    expect(systemPrompt).toMatch(/tanpa markdown|jangan pakai \*\*|plain text/i);
    expect(systemPrompt + userPrompt).toMatch(/Marketing (2|3|4)\.0/);
    expect(userPrompt).not.toMatch(/\*\*\[Jenis properti\]/);
    expect(userPrompt).not.toMatch(/\*\*Spesifikasi:\*\*/);
  });

  it('should correctly format compact price for millions and billions', () => {
    const formatCompactPrice = (descriptionGeneratorService as any).formatCompactPrice.bind(descriptionGeneratorService);
    
    expect(formatCompactPrice(575000000)).toBe('Rp575 Juta');
    expect(formatCompactPrice(975000000)).toBe('Rp975 Juta');
    expect(formatCompactPrice(1800000000)).toBe('Rp1,8 Miliar');
    expect(formatCompactPrice(25000000000)).toBe('Rp25 Miliar');
  });

  it('should construct user prompt containing exact listing ID data and output structure markers', () => {
    const buildUserPrompt = (descriptionGeneratorService as any).buildUserPrompt.bind(descriptionGeneratorService);
    const userPrompt = buildUserPrompt(sampleListing);

    expect(userPrompt).toContain('=== DATA LISTING ===');
    expect(userPrompt).toContain('Judul: Rumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol');
    expect(userPrompt).toContain('Harga: Rp 975.000.000 (Rp975 Juta)');
    expect(userPrompt).toContain('Luas tanah: 72 m²');
    expect(userPrompt).toContain('Luas bangunan: 100 m²');
    expect(userPrompt).toContain('Link: https://www.acehome.co.id/project/detail/9f1c3ad7-d2b6-43e5-b641-eae0f5c9924e');
    expect(userPrompt).toContain('[[FORMAL]]');
    expect(userPrompt).toContain('[[PAS]]');
    expect(userPrompt).toContain('[[SHORT]]');
  });

  it('should construct system prompt containing strict fact rules and format rules', () => {
    const buildSystemPrompt = (descriptionGeneratorService as any).buildSystemPrompt.bind(descriptionGeneratorService);
    const systemPrompt = buildSystemPrompt(sampleListing);

    expect(systemPrompt).toContain('copywriter properti untuk agen real estate di Bandung Raya');
    expect(systemPrompt).toContain('ATURAN FAKTA (berlaku untuk semua versi):');
    expect(systemPrompt).toContain('ATURAN FORMAT & HARGA:');
    expect(systemPrompt).toContain("FORMAT OUTPUT 'formal'");
    expect(systemPrompt).toContain("FORMAT OUTPUT 'pas'");
    expect(systemPrompt).toContain("FORMAT OUTPUT 'short'");
    expect(systemPrompt).toContain('Problem-Agitate-Solution, voice Marketing 3.0/4.0');
    expect(systemPrompt).toContain('PERIKSA DATA: [alasan singkat]');
    expect(systemPrompt).toMatch(/Hook\s*→\s*Problem\s*→\s*Solution\s*→\s*CTA/);
    expect(systemPrompt).toMatch(/minimal 4 paragraf|jangan singkat/i);
  });

  it('writes a full Hook → Problem → Solution → CTA formal fallback, not a 2-sentence stub', async () => {
    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);
    const formal = result.formal.replace(/\s+/g, ' ').trim();

    expect(formal.length).toBeGreaterThan(400);
    expect(result.formal.split(/\n\s*\n/).length).toBeGreaterThanOrEqual(4);
    expect(result.formal).toMatch(/Spesifikasi:/);
    expect(result.formal).toMatch(/Survey:/);
    expect(result.formal).toMatch(/hubungi|chat|DM|WhatsApp|survey/i);
    expect(result.formal).not.toMatch(/^\*\*[^*]+\*\*\s*\n\n[^\n]+\n\n\*\*Spesifikasi:/);
  });

  it('rejects a too-short LLM formal and falls back to the full Hook-Problem-Solution-CTA copy', async () => {
    const llmClient = await import('../utils/llmClient');
    vi.spyOn(llmClient.default, 'generateJSON').mockResolvedValueOnce({
      formal: `**Rumah di Setiabudi Regency – Rp5,5 Miliar**

Rumah Kokoh dan Luas di Setiabudi Regency Bandung. Hunian nyaman di lokasi strategis Setiabudi Regency.

**Spesifikasi:** 6 KT, 4 KM, LT 300 m², LB 800 m²

**Pembayaran:** CASH DAN KPR. **Survey:** JANJIAN SATU HARI SEBELUMNYA.

**Catatan:** Akses lokasi: 2 MOBIL`,
      pas: 'Lagi cari rumah di Bandung? Hubungi kami.',
      short: 'Rumah Bandung Rp5,5 Miliar',
    });

    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);
    expect(result.formal.replace(/\s+/g, ' ').trim().length).toBeGreaterThan(400);
    expect(result.formal).toContain('Ngamprah Bandung Barat');
    expect(result.formal).toContain('Rp975 Juta');
    expect(result.pas.length).toBeGreaterThan(200);
  });

  it('rejects a long stub-shaped LLM formal that still skips Problem and CTA', async () => {
    const llmClient = await import('../utils/llmClient');
    vi.spyOn(llmClient.default, 'generateJSON').mockResolvedValueOnce({
      formal: `Rumah di Setiabudi Regency – Rp5,5 Miliar

Rumah Kokoh dan Luas di Setiabudi Regency Bandung. Hunian nyaman di lokasi strategis Setiabudi Regency.

Spesifikasi: 6 KT, 4 KM, LT 300 m², LB 800 m², lebar muka 10 m, listrik 3500 watt, air PDAM, SHM

Pembayaran: CASH DAN KPR. Survey: JANJIAN SATU HARI SEBELUMNYA.

Catatan: Akses lokasi: 2 MOBIL. Unit readystock, 2 lantai, carport 2 mobil, rooftop, dapur, ruang keluarga.`,
      pas: `Lagi cari rumah di Bandung?

Mencari rumah luas di Setiabudi memang butuh waktu. Banyak unit terlihat bagus di foto tapi datanya kurang.

Solusinya Rumah Kokoh Setiabudi.

Spesifikasi: 6 KT, 4 KM
Survey: janjian. Hubungi kami sekarang.`,
      short: 'Rumah Bandung Rp5,5 Miliar. Hubungi kami.',
    });

    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);
    expect(result.formal).not.toMatch(/Hunian nyaman di lokasi strategis/);
    expect(result.formal).toMatch(/Masih mencari|Lagi cari/i);
    const beforeSpecs = result.formal.split(/Spesifikasi:/i)[0];
    const prose = beforeSpecs.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    expect(prose.length).toBeGreaterThanOrEqual(4);
    expect(result.formal).toMatch(/hubungi kami/i);
  });

  it('builds a full Formal for Rumah Kokoh Setiabudi with specs, selling points, and CTA', async () => {
    const setiabudi: Listing = {
      ...sampleListing,
      id: '4bb83d6a-e789-414a-8f71-7fa3c2b9cea4',
      title: 'Rumah Kokoh dan Luas di Setiabudi Regency Bandung',
      location: 'Setiabudi Regency',
      price: 5500000000,
      bedrooms: 6,
      bathrooms: 4,
      land_area: 300,
      building_area: 800,
      additional_info: `Harga: Rp5.500.000.000
Detail:
Luas Tanah: 300.00 m²
Luas Bangunan: 800.00 m²
Kamar Tidur: 6
Kamar Mandi: 4
Deskripsi:
Rumah Kokoh dan Luas di Setiabudi Regency Bandung
Spesifikasi:
- luas tanah 300 m2
- luas bangunan 800 m2
- garasi muat 2 mobil
- carport muat 2 mobil
- lebar muka 13 meter
CARA BAYAR : CASH DAN KPR
AKSES LOKASI : 2 MOBIL
SURVEY : JANJIAN SATU HARI SEBELUMNYA

Selling Point & Keunggulan:
• Lingkungan Asri dan Sejuk
	• Berada di dataran tinggi Bandung Utara dengan udara yang sangat dingin, segar, dan bebas polusi.
• Pemandangan Indah (City View)
	• Terkenal memiliki panorama city view dan city light terbaik yang menghadap ke lanskap Kota Bandung dari ketinggian.
• Aksesibilitas Strategis ke Pusat Edukasi & Wisata
	• Dekat dengan kampus-kampus ternama (seperti UPI ±7 menit).
	• Akses cepat ke kawasan wisata populer di Lembang (seperti Farmhouse, Floating Market, dan Dusun Bambu).
Lokasi: Setiabudi Regency`,
    };

    const llmClient = await import('../utils/llmClient');
    vi.spyOn(llmClient.default, 'generateJSON').mockResolvedValueOnce({
      formal: `Rumah di Setiabudi Regency – Rp5,5 Miliar

Rumah Kokoh dan Luas di Setiabudi Regency Bandung. Hunian nyaman di lokasi strategis Setiabudi Regency.

Spesifikasi: 6 KT, 4 KM, LT 300 m², LB 800 m²

Pembayaran: CASH DAN KPR. Survey: JANJIAN SATU HARI SEBELUMNYA.

Catatan: Akses lokasi: 2 MOBIL`,
      pas: 'Lagi cari rumah di Bandung? Hubungi kami.',
      short: 'Rumah Bandung Rp5,5 Miliar',
    });

    const result = await descriptionGeneratorService.generateDescriptions(setiabudi);
    const formal = result.formal;

    expect(formal).not.toMatch(/Hunian nyaman di lokasi strategis/);
    expect(formal).toMatch(/Masih mencari|Lagi cari/i);
    expect(formal).toMatch(/6 KT/);
    expect(formal).toMatch(/4 KM/);
    expect(formal).toMatch(/LT 300/);
    expect(formal).toMatch(/LB 800/);
    expect(formal).toMatch(/lebar muka 13/i);
    expect(formal).toMatch(/garasi muat 2 mobil/i);
    expect(formal).toMatch(/carport muat 2 mobil/i);
    expect(formal).toMatch(/UPI/i);
    expect(formal).toMatch(/Lembang/i);
    expect(formal).toMatch(/hubungi kami/i);
    expect(formal.split(/\n\s*\n/).length).toBeGreaterThanOrEqual(4);
    const beforeSpecs = formal.split(/Spesifikasi:/i)[0];
    const prose = beforeSpecs.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    expect(prose.length).toBeGreaterThanOrEqual(4);
  });
});
