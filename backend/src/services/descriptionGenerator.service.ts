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
   * - PAS: for Instagram feed / Facebook / WhatsApp broadcast (Problem-Agitate-Solution + Social Proof + Comparative + CTA)
   * - Short: for Instagram Story / WhatsApp Status
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
      if (!response.formal || !response.pas || !response.short) {
        throw new Error('Invalid response structure from LLM');
      }

      return {
        formal: postProcessDescription(response.formal),
        pas: postProcessDescription(response.pas),
        short: postProcessDescription(response.short),
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
  "pas": "Konten Instagram/WA shareable dengan struktur Problem-Agitate-Solution + Social Proof + Comparative + CTA. Emoji maksimal 3.",
  "short": "Instagram Story / WhatsApp Status super singkat dan punchy. Sebutkan harga HANYA SEKALI. 3-5 emoji."
}

ATURAN FAKTA (berlaku untuk semua versi):
1. Gunakan HANYA fakta yang ada di data listing. Jangan menambah fasilitas, jarak, kondisi, atau klaim yang tidak tertulis.
2. Jika suatu data tidak ada, lewati barisnya. Jangan menebak.
3. Pertahankan istilah asli dari data, jangan diubah artinya.
4. Dilarang urgensi palsu kecuali tertulis di data.
5. Dilarang kata berlebihan: "termurah", "dijamin", "terbaik se-Bandung".
6. Keluarkan HANYA tiga versi dalam JSON (formal, pas, short) tanpa pembuka, penjelasan, atau penutup tambahan.

ATURAN FORMAT & HARGA:
7. Bahasa Indonesia. Harga ditulis singkat: 575000000 -> "Rp575 Juta", 1800000000 -> "Rp1,8 Miliar". Harga properti ini: ${compactPrice}.
8. Urutkan akses terdekat dari waktu tempuh terpendek.
9. Jika ada keterbatasan yang relevan bagi pembeli (misalnya akses 1 mobil), jangan disembunyikan. Sebut secara netral sesuai format masing-masing versi.
11. Keluarkan HANYA tiga versi dalam JSON (formal, pas, short) tanpa pembuka, penjelasan, atau penutup tambahan.

FORMAT OUTPUT 'formal' (WAJIB ikuti struktur persis ini):

**[Jenis properti] di [Nama perumahan/area], [Kota/Kecamatan] – [Harga]**

[Pembuka 1-2 kalimat]

**Spesifikasi:** [KT, KM, LT, LB, lebar muka, listrik, air, legalitas, dipisah koma]

**Akses terdekat:** [Tempat + waktu tempuh, urut dari yang terdekat]

**Pembayaran:** [Metode]. **Survey:** [Aturan survey].

**Catatan:** [Opsional, hanya jika ada keterbatasan]

FORMAT OUTPUT 'pas' (Problem-Agitate-Solution + Social Proof + Comparative + CTA):

**[Hook satu baris berupa pertanyaan/pernyataan tentang masalah pembeli]**

[Problem: Situasi sebelum (Before) - kesulitan pembeli cari properti. 2-3 kalimat]
[Agitate: Perluas rasa masalah - biaya waktu, stres, kerugian jika salah pilih. 2 kalimat]
[Social Proof: Sebutkan bukti kepercayaan (pengalaman klien lain, track record agen, transaksi sukses). 1-2 kalimat]
[Comparative: Perbandingan dengan alternatif lain (rumah kontrak, apartemen, cari sendiri) - kenapa properti ini unggul. 1-2 kalimat]
[Solution: Properti ini sebagai solusi (After) - After state, manfaat spesifik dari data listing. 2 kalimat]
[CTA: Ajakan jelas - chat/DM untuk survey, sebut aturan survey. 1 kalimat]

FORMAT OUTPUT 'short' (Instagram Story / WhatsApp Status):

**[Hook - max 100 karakter, wajib memuat harga atau area]**

[Emoji] [Harga] | [KT] KT, [KM] KM | LT [x] m² / LB [x] m²
[Emoji] [Akses terdekat 1 + waktu]
[Emoji] [Akses terdekat 2 + waktu]
[Emoji] [Legalitas + cara bayar]

[CTA 1-2 kalimat: ajak klik link di bio untuk foto/detail DAN chat/DM/WhatsApp untuk jadwal survey. Sebut aturan survey jika ada. Keterbatasan relevan singkat.]

[5-8 hashtag: 2 area, 2 jenis/segmen properti, 2 umum]`;
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
Tulis persis dengan penanda di bawah (atau sebagai nilai key JSON: formal, pas, short).

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
Struktur Problem, Agitate, Solution + Social Proof + Comparative + CTA:
- Pilih SATU masalah pembeli yang paling cocok dengan keunggulan terkuat listing. Jangan menumpuk masalah.
- Problem dan Agitate boleh bersifat umum, tapi tidak boleh berisi klaim faktual palsu tentang pasar, kompetitor, atau properti lain.
Format:
**[Hook satu baris berupa pertanyaan/pernyataan tentang masalah pembeli]**

[Problem: Situasi sebelum (Before) - kesulitan pembeli cari properti. 2-3 kalimat]
[Agitate: Perluas rasa masalah - biaya waktu, stres, kerugian jika salah pilih. 2 kalimat]
[Social Proof: Sebutkan bukti kepercayaan (pengalaman klien lain, track record agen, transaksi sukses). 1-2 kalimat]
[Comparative: Perbandingan dengan alternatif lain (rumah kontrak, apartemen, cari sendiri) - kenapa properti ini unggul. 1-2 kalimat]
[Solution: Properti ini sebagai solusi (After) - After state, manfaat spesifik dari data listing. 2 kalimat]
[CTA: Ajakan jelas - chat/DM untuk survey, sebut aturan survey. 1 kalimat]
[[/PAS]]

[[SHORT]]
Nada: santai tapi sopan. Untuk caption Instagram, mengajak klik dan menghubungi. Batas: maksimal 600 karakter tidak termasuk hashtag, emoji maksimal 4 sebagai penanda baris. Hook maksimal 100 karakter dan wajib memuat harga atau area. Pilih 3-4 fakta terkuat saja.
Format:
**[Hook - max 100 karakter, wajib memuat harga atau area]**

[Emoji] [Harga] | [KT] KT, [KM] KM | LT [x] m² / LB [x] m²
[Emoji] [Akses terdekat 1 + waktu]
[Emoji] [Akses terdekat 2 + waktu]
[Emoji] [Legalitas + cara bayar]

[CTA 1-2 kalimat: ajak klik link di bio untuk foto/detail DAN chat/DM/WhatsApp untuk jadwal survey. Sebut aturan survey jika ada. Keterbatasan relevan singkat di sini.]

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

    // 2. PAS — Problem-Agitate-Solution + Social Proof + Comparative + CTA
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
    const pas = pasLines.join('\n');

    // 3. SHORT — Instagram Story / WhatsApp Status
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
    const short = shortLines.join('\n');

    return {
      formal: postProcessDescription(formal),
      pas: postProcessDescription(pas),
      short: postProcessDescription(short),
    };
  }
}

export default new DescriptionGeneratorService();