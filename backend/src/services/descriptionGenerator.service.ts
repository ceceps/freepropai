import llmClient from '../utils/llmClient';
import type { Listing, GeneratedDescriptions } from '../types';

/**
 * Normalize text that has concatenated words (common in scraped HTML).
 * Inserts spaces at common boundaries:
 * - lowercase -> uppercase (e.g., "RegencyKesempatan" -> "Regency Kesempatan")
 * - letter -> digit or digit -> letter (e.g., "m²2" -> "m² 2", "2Kamar" -> "2 Kamar")
 * - multiple newlines to single newline
 * - multiple spaces to single space
 */
function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Insert space between lowercase letter and uppercase letter
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space between letter and digit (avoiding decimal numbers like 72.00)
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    // Insert space between digit and letter
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Insert space between ) and letter
    .replace(/(\))([a-zA-Z])/g, '$1 $2')
    // Insert space between letter and (
    .replace(/([a-zA-Z])(\()/g, '$1 $2')
    // Insert space after : if followed by letter/number
    .replace(/(:)([a-zA-Z0-9])/g, '$1 $2')
    // Fix multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Fix multiple spaces
    .replace(/ {2,}/g, ' ')
    .trim();
}

/**
 * Deduplicate repeating paragraph blocks (e.g. LLM looping or appending raw scraped content multiple times)
 */
function removeDuplicateParagraphs(text: string): string {
  if (!text) return '';
  const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const uniqueParagraphs: string[] = [];
  
  for (const p of paragraphs) {
    // Avoid exact duplicate paragraphs or paragraphs that are 90%+ identical
    const isDuplicate = uniqueParagraphs.some(existing => {
      if (existing === p) return true;
      if (p.length > 50 && existing.length > 50) {
        const similarity = existing.includes(p.slice(0, 40)) || p.includes(existing.slice(0, 40));
        return similarity;
      }
      return false;
    });
    if (!isDuplicate) {
      uniqueParagraphs.push(p);
    }
  }
  
  return uniqueParagraphs.join('\n\n');
}

/**
 * Remove duplicate price mentions (e.g. "Rp 782.000.000" appearing more than once)
 * Keeps only the first occurrence of any price pattern.
 * Also cleans up orphaned labels like "Harga:" that precede removed prices.
 */
function removeDuplicatePrices(text: string): string {
  if (!text) return '';
  
  // Find all price patterns (Rp + digits/spaces/dots/commas + optional Juta/Milyar)
  // Handles normalized text like "Rp 782. 700. 000" or "Rp 782.700.000"
  const pricePattern = /Rp\s*\d[\d\s.,]*(?:\s*(?:Juta|Milyar))?/gi;
  const matches: Array<{match: string, start: number, end: number}> = [];
  let match;
  while ((match = pricePattern.exec(text)) !== null) {
    matches.push({
      match: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  // If more than one price found, keep only the first
  if (matches.length <= 1) return text;
  
  // Remove subsequent price mentions and their orphaned labels
  let result = text;
  for (let i = 1; i < matches.length; i++) {
    const m = matches[i];
    let removeStart = m.start;
    
    // Check if there's a label like "Harga:" or "Harga :" before the price
    const textBefore = result.slice(Math.max(0, m.start - 20), m.start);
    const labelMatch = textBefore.match(/(?:Harga|Price)\s*:?\s*$/i);
    if (labelMatch) {
      removeStart = m.start - labelMatch[0].length;
    }
    
    // Remove the price and any trailing whitespace/punctuation
    let removeEnd = m.end;
    while (removeEnd < result.length && /[\s,.;:]/.test(result[removeEnd])) {
      removeEnd++;
    }
    
    result = result.slice(0, removeStart) + result.slice(removeEnd);
  }
  
  // Clean up any resulting double spaces or orphaned newlines
  result = result.replace(/ {2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  
  return result;
}

/**
 * Post-process description output to ensure proper formatting
 */
function postProcessDescription(text: string): string {
  if (!text) return '';
  
  let cleaned = text
    // Remove section marker labels ([HOOK], [PROBLEM], [SOLUTION], [CTA], [AGITATE])
    .replace(/^\s*\[(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\]\s*:?\s*$/gim, '')
    .replace(/\[(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\]/gi, '')
    // Strip {HOOK}, **HOOK**, Hook:, Problem:, Solution:, CTA:, Agitate:
    .replace(/^\s*\*{0,2}(?:Hook|Problem|Agitate|Solution|CTA)\*{0,2}\s*:?\s*$/gim, '')
    .replace(/^\s*\{(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\}\s*:?\s*$/gim, '')
    .replace(/\{(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\}/gi, '')
    // Fix markdown bold label trailing spaces, e.g. "**Spesifikasi: **" -> "**Spesifikasi:** "
    .replace(/\*\*\s*([^*:]+):\s*\*\*\s*/g, '**$1:** ')
    // Fix multiple spaces/newlines
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  cleaned = removeDuplicateParagraphs(cleaned);
  cleaned = removeDuplicatePrices(cleaned);

  return cleaned;
}

class DescriptionGeneratorService {
  /**
   * Generate 3 description variants for a property listing
   * - Formal: for listing portals (OLX, Rumah123)
   * - Casual #1: for Instagram feed post
   * - Casual #2: for Instagram story / WhatsApp status
   */
  async generateDescriptions(listing: Listing): Promise<GeneratedDescriptions> {
    const systemPrompt = this.buildSystemPrompt(listing);
    const userPrompt = this.buildUserPrompt(listing);

    try {
      console.log('🤖 Calling Claude API...');
      const response = await llmClient.generateJSON<GeneratedDescriptions>(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.7,
          maxTokens: 3000,
        }
      );

      console.log('✅ Claude API response received');

      // Validate response structure
      if (!response.formal || !response.casual_1 || !response.casual_2) {
        throw new Error('Invalid response structure from LLM');
      }

      return {
        formal: postProcessDescription(response.formal),
        casual_1: postProcessDescription(response.casual_1),
        casual_2: postProcessDescription(response.casual_2),
      };
    } catch (error) {
      console.warn('⚠️ LLM generation failed, using template-based generator fallback:', error instanceof Error ? error.message : error);
      return this.generateFallbackDescriptions(listing);
    }
  }

  private getPropertyTypeLabel(type?: string): string {
    if (!type) return 'Properti';
    const lower = type.toLowerCase().trim();
    if (lower === 'house') return 'Rumah';
    if (lower === 'apartment') return 'Apartemen';
    if (lower === 'land') return 'Tanah';
    if (lower === 'shophouse' || lower === 'ruko') return 'Ruko';
    if (lower === 'villa') return 'Villa';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  private formatCompactPrice(price: number): string {
    if (price >= 1_000_000_000) {
      const b = price / 1_000_000_000;
      const str = b % 1 === 0 ? b.toString() : b.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
      return `Rp${str} Miliar`;
    }
    const m = price / 1_000_000;
    const str = m % 1 === 0 ? m.toString() : m.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    return `Rp${str} Juta`;
  }

  /**
   * Build system prompt for LLM - Copywriter properti Bandung Raya persona
   */
  private buildSystemPrompt(listing: Listing): string {
    const compactPrice = this.formatCompactPrice(listing.price);

    return `Kamu adalah copywriter properti untuk agen real estate di Bandung Raya (Bandung, Cimahi, Bandung Barat, Depok). Tugasmu mengubah data mentah listing menjadi deskripsi iklan yang rapi, akurat, dan siap posting.

Return ONLY valid JSON format (no markdown code fence, no explanation):
{
  "formal": "Deskripsi formal sesuai FORMAT OUTPUT KETAT di bawah.",
  "casual_1": "Konten Instagram feed shareable (Problem -> Agitate -> Solution -> CTA) dengan humor/kedekatan khas Indo. Sebutkan harga HANYA SEKALI. 2-3 emoji.",
  "casual_2": "Instagram Story / WhatsApp Status super singkat dan punchy. Sebutkan harga HANYA SEKALI. 3-5 emoji."
}

ATURAN FAKTA (berlaku untuk semua versi):
1. Gunakan HANYA fakta yang ada di data listing. Jangan menambah fasilitas, jarak, kondisi, atau klaim yang tidak tertulis (misalnya "banjir bebas", "investasi menguntungkan").
2. Jika suatu data tidak ada, lewati barisnya. Jangan menebak.
3. Pertahankan istilah asli dari data (misalnya "SHM on hand", "sibel komplek"), jangan diubah artinya.
4. Dilarang urgensi palsu ("tinggal 1 unit", "harga naik besok", "banyak yang antre") kecuali tertulis di data.
5. Dilarang kata berlebihan: "termurah", "dijamin", "terbaik se-Bandung".
6. Ketiga versi harus konsisten. Fakta, angka, dan jarak yang sama tidak boleh berbeda antar versi.

ATURAN FORMAT & HARGA:
7. Bahasa Indonesia. Harga ditulis singkat: 575000000 -> "Rp575 Juta", 1800000000 -> "Rp1,8 Miliar". Harga properti ini: ${compactPrice}.
8. Urutkan akses terdekat dari waktu tempuh terpendek.
9. Jika ada keterbatasan yang relevan bagi pembeli (misalnya akses 1 mobil), jangan disembunyikan. Sebut secara netral sesuai format masing-masing versi.
10. Jika data harga atau luas terlihat tidak wajar (misalnya harga jauh di luar pola untuk jumlah kamar dan luasnya), tetap tulis sesuai data, tapi tambahkan satu baris di paling akhir output: "PERIKSA DATA: [alasan singkat]".
11. Keluarkan HANYA tiga versi dalam JSON (formal, casual_1, casual_2) tanpa pembuka, penjelasan, atau penutup tambahan.

FORMAT OUTPUT 'formal' (WAJIB ikuti struktur persis ini):

**[Jenis properti] di [Nama perumahan/area], [Kota/Kecamatan] – [Harga]**

[Pembuka 1-2 kalimat]

**Spesifikasi:** [KT, KM, LT, LB, lebar muka, listrik, air, legalitas, dipisah koma]

**Akses terdekat:** [Tempat + waktu tempuh, urut dari yang terdekat]

**Pembayaran:** [Metode]. **Survey:** [Aturan survey].

**Catatan:** [Opsional, hanya jika ada keterbatasan]`;
  }

  /**
   * Build user prompt with listing details
   */
  private buildUserPrompt(listing: Listing): string {
    const priceFormatted = this.formatPrice(listing.price);
    const compactPrice = this.formatCompactPrice(listing.price);
    const kontakWa = (listing as any).agentPhone || (listing as any).agent_phone || 'Hubungi Agen';
    const linkListing = listing.source_url || '-';

    return `Buat 3 deskripsi dari data listing berikut, dengan struktur berbeda.

=== DATA LISTING ===
Judul: ${normalizeText(listing.title || 'Properti')}
Harga: Rp ${priceFormatted} (${compactPrice})
Kamar tidur: ${listing.bedrooms ?? '-'}
Kamar mandi: ${listing.bathrooms ?? '-'}
Luas tanah: ${listing.land_area ? `${listing.land_area} m²` : '-'}
Luas bangunan: ${listing.building_area ? `${listing.building_area} m²` : '-'}
Info tambahan: ${listing.additional_info ? normalizeText(listing.additional_info) : '-'}
Kontak: ${kontakWa}
Link: ${linkListing}

=== OUTPUT ===
Tulis persis dengan penanda di bawah (atau sebagai nilai key JSON: formal, casual_1, casual_2).

[[FORMAL]]
Nada: ramah dan profesional, tanpa emoji. Untuk portal dan website.
Format:
**[Jenis properti] di [Nama perumahan/area], [Kota/Kecamatan] – [Harga]**

[Pembuka 1-2 kalimat: kedekatan utama dan siapa yang cocok membeli, hanya jika didukung data]

**Spesifikasi:** [KT, KM, LT, LB, lebar muka, listrik, air, legalitas, dipisah koma]

**Akses terdekat:** [Tempat + waktu tempuh]

**Pembayaran:** [Metode]. **Survey:** [Aturan survey].

**Catatan:** [Opsional, keterbatasan relevan]
[[/FORMAL]]

[[PAS]]
Nada: hangat dan percaya diri. Emoji maksimal 3, hanya di bagian Solution. Untuk Instagram, Facebook, WhatsApp broadcast.
Struktur Problem, Agitate, Solution:
- Pilih SATU masalah pembeli yang paling cocok dengan keunggulan terkuat listing. Jangan menumpuk masalah.
- Problem dan Agitate boleh bersifat umum, tapi tidak boleh berisi klaim faktual palsu tentang pasar, kompetitor, atau properti lain.
Format:
[Hook satu baris berupa pertanyaan atau pernyataan tentang masalah]

[Problem + Agitate, 3-4 kalimat berisi situasi sehari-hari]

[Kalimat transisi ke solusi, satu baris]

**[Jenis properti] di [Perumahan/Area] – [Harga]**
- Spesifikasi: [KT, KM, LT, LB, lebar muka, listrik, air, legalitas]
- Akses terdekat: [Tempat + waktu tempuh]
- Pembayaran: [Metode]

**Survey:** [Aturan survey]. [CTA satu kalimat ajak chat untuk survey]

**Catatan:** [Opsional]
[[/PAS]]

[[SHORT]]
Nada: santai tapi sopan. Untuk caption Instagram, mengajak klik dan menghubungi. Batas: maksimal 600 karakter tidak termasuk hashtag, emoji maksimal 4 sebagai penanda baris. Hook maksimal 100 karakter dan wajib memuat harga atau area. Pilih 3-4 fakta terkuat saja.
Format:
[Hook]

[Emoji] [Harga] | [KT] KT, [KM] KM | LT [x] m² / LB [x] m²
[Emoji] [Akses terdekat 1 + waktu]
[Emoji] [Akses terdekat 2 + waktu]
[Emoji] [Legalitas + cara bayar]

[CTA 1-2 kalimat: ajak klik link di bio untuk foto dan detail lengkap, DAN chat/DM/WhatsApp untuk jadwalkan survey. Sebut aturan survey jika ada. Keterbatasan relevan cukup disebut singkat di sini.]

[5-8 hashtag: 2 area, 2 jenis/segmen properti, 2 umum]
[[/SHORT]]`;
  }

  /**
   * Format price with thousand separators
   */
  private formatPrice(price: number): string {
    return price.toLocaleString('id-ID');
  }

  /**
   * Fallback generator when LLM API call fails - dynamic, structured to exact templates
   */
  private generateFallbackDescriptions(listing: Listing): GeneratedDescriptions {
    const typeTitle = this.getPropertyTypeLabel(listing.property_type);
    const compactPrice = this.formatCompactPrice(listing.price);
    const loc = listing.location || 'Bandung';
    const titleStr = listing.title || `${typeTitle} di ${loc}`;
    const addInfo = listing.additional_info ? normalizeText(listing.additional_info) : '';

    // Extract structured info from raw additional_info if present
    let sellingPoints = '';
    let caraBayar = 'Cash & KPR';
    let surveyRules = 'Janjian satu hari sebelumnya';
    let catatan = '';

    if (addInfo) {
      const spMatch = addInfo.match(/Selling Point:\s*([\s\S]*?)(?=(CARA BAYAR|AKSES LOKASI|SURVEY|$))/i);
      if (spMatch && spMatch[1]) {
        sellingPoints = spMatch[1].replace(/[-•]\s*/g, '').split('\n').map(s => s.trim()).filter(Boolean).join(', ');
      }
      const cbMatch = addInfo.match(/CARA BAYAR\s*:\s*([^\n]+)/i);
      if (cbMatch && cbMatch[1]) caraBayar = cbMatch[1].trim();

      const surMatch = addInfo.match(/SURVEY\s*:\s*([^\n]+)/i);
      if (surMatch && surMatch[1]) surveyRules = surMatch[1].trim();

      const aksMatch = addInfo.match(/AKSES LOKASI\s*:\s*([^\n]+)/i);
      if (aksMatch && aksMatch[1]) catatan = `Akses lokasi: ${aksMatch[1].trim()}`;
    }

    const specsList: string[] = [];
    if (listing.bedrooms) specsList.push(`${listing.bedrooms} KT`);
    if (listing.bathrooms) specsList.push(`${listing.bathrooms} KM`);
    if (listing.land_area) specsList.push(`LT ${listing.land_area} m²`);
    if (listing.building_area) specsList.push(`LB ${listing.building_area} m²`);
    const specsStr = specsList.join(', ');

    // 1. FORMAL
    const formalLines: string[] = [];
    formalLines.push(`**${typeTitle} di ${loc} – ${compactPrice}**\n`);
    formalLines.push(`${titleStr}. Hunian nyaman di lokasi strategis ${loc}.\n`);
    if (specsStr) formalLines.push(`**Spesifikasi:** ${specsStr}`);
    if (sellingPoints) formalLines.push(`**Akses terdekat:** ${sellingPoints}`);
    formalLines.push(`**Pembayaran:** ${caraBayar}. **Survey:** ${surveyRules}.`);
    if (catatan) formalLines.push(`\n**Catatan:** ${catatan}`);
    const formal = formalLines.join('\n');

    // 2. PAS (CASUAL 1)
    const pasLines: string[] = [];
    pasLines.push(`Lagi cari hunian strategis di ${loc} yang dekat akses transportasi?\n`);
    pasLines.push(`Mencari properti dengan spesifikasi lengkap dan lokasi berkembang memang butuh kecermatan. Unit berkualitas di area ini selalu diminati pembeli gercep.\n`);
    pasLines.push(`Solusinya ${titleStr}! ✨\n`);
    pasLines.push(`**${typeTitle} di ${loc} – ${compactPrice}**`);
    if (specsStr) pasLines.push(`- Spesifikasi: ${specsStr}`);
    if (sellingPoints) pasLines.push(`- Akses terdekat: ${sellingPoints}`);
    pasLines.push(`- Pembayaran: ${caraBayar}`);
    pasLines.push(`\n**Survey:** ${surveyRules}. Hubungi kami sekarang untuk jadwal survey! 🔑`);
    if (catatan) pasLines.push(`\n**Catatan:** ${catatan}`);
    const casual_1 = pasLines.join('\n');

    // 3. SHORT (CASUAL 2)
    const locClean = loc.replace(/\s+Bandung\s+Barat/i, '');
    const shortLines: string[] = [];
    shortLines.push(`🔥 ${titleStr} – ${loc}!`);
    shortLines.push(`\n🏠 ${compactPrice} | ${specsStr.replace(/,/g, ' |')}`);
    if (sellingPoints) {
      const spParts = sellingPoints.split(',');
      if (spParts[0]) shortLines.push(`📍 ${spParts[0].trim()}`);
      if (spParts[1]) shortLines.push(`📍 ${spParts[1].trim()}`);
    } else {
      shortLines.push(`📍 Lokasi strategis ${loc}`);
    }
    shortLines.push(`💳 ${caraBayar}`);
    shortLines.push(`\nKlik link di bio & hubungi kami untuk survey (${surveyRules}). 📲`);
    shortLines.push(`\n#rumah${locClean.toLowerCase().replace(/\s+/g, '')} #propertibandung #rumahdijual #rumahsiaphuni #investasiproperti`);
    const casual_2 = shortLines.join('\n');

    return {
      formal: postProcessDescription(formal),
      casual_1: postProcessDescription(casual_1),
      casual_2: postProcessDescription(casual_2),
    };
  }
}

export default new DescriptionGeneratorService();