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
  const pricePattern = /Rp\s*\d[\d\s.,]*(?:\s*(?:Juta|Milyar|Miliar))?/gi;
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
    const labelMatch = textBefore.match(/(?:Harga|Price)\s*:\s*$/i);
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
    .replace(/\*\*/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  cleaned = removeDuplicateParagraphs(cleaned);
  cleaned = removeDuplicatePrices(cleaned);

  return cleaned;
}

function isThinDescription(text: string, minChars: number): boolean {
  return (text || '').replace(/\s+/g, ' ').trim().length < minChars;
}

function stripMd(text: string): string {
  return text.replace(/\*+/g, '').trim();
}

function isIncompleteFormal(text: string): boolean {
  const body = (text || '').trim();
  if (!body || isThinDescription(body, 400)) return true;

  const paragraphs = body.split(/\n\s*\n/).map(stripMd).filter(Boolean);
  const labeled = /^(Spesifikasi|Akses terdekat|Pembayaran|Survey|Catatan)\s*:/i;
  const title = /^.+\s+di\s+.+\s+[–—-]\s*Rp/i;
  const specsIndex = paragraphs.findIndex((p) => /^Spesifikasi\s*:/i.test(p));
  const before = paragraphs
    .slice(0, specsIndex === -1 ? paragraphs.length : specsIndex)
    .filter((p, i) => !(i === 0 && title.test(p)))
    .filter((p) => !labeled.test(p));

  if (before.length < 3) return true;

  const after = specsIndex === -1 ? [] : paragraphs.slice(specsIndex + 1);
  const hasCta = after.some((p) => {
    if (/^(Spesifikasi|Akses terdekat|Pembayaran|Survey|Catatan)\s*:/i.test(p)) return false;
    return /hubungi|chat\b|\bDM\b|WhatsApp|jadwalkan survey/i.test(p);
  });
  return !hasCta;
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

      const formal = postProcessDescription(response.formal);
      const pas = postProcessDescription(response.pas);
      const short = postProcessDescription(response.short);

      if (isIncompleteFormal(formal) || isThinDescription(pas, 200)) {
        console.warn('⚠️ LLM description too short or missing Hook-Problem-Solution-CTA body, using fallback');
        return this.generateFallbackDescriptions(listing);
      }

      return { formal, pas, short };
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
  "formal": "Deskripsi formal Hook → Problem → Solution → CTA. Jangan singkat. Minimal 4 paragraf plus blok spesifikasi. Plain text, tanpa markdown.",
  "pas": "PAS feed Instagram. Voice Marketing 3.0/4.0: cerita hidup, kamu/kita, bukan dump spek. Harga HANYA SEKALI. 2-3 emoji.",
  "short": "Short caption. Voice Marketing 2.0/4.0: punchy, percakapan, ajak chat. Harga HANYA SEKALI. 3-5 emoji."
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
10. Jika data harga atau luas terlihat tidak wajar (misalnya harga jauh di luar pola untuk jumlah kamar dan luasnya), tetap tulis sesuai data, tapi tambahkan satu baris di paling akhir output: "PERIKSA DATA: [alasan singkat]".
11. Keluarkan HANYA tiga versi dalam JSON (formal, pas, short) tanpa pembuka, penjelasan, atau penutup tambahan.
12. Versi formal WAJIB Hook → Problem → Solution → CTA. Jangan singkat. Minimal 4 paragraf isi (hook, problem, solution, CTA) sebelum atau di sekitar blok spesifikasi. Jangan tulis label Hook/Problem/Solution/CTA di output. Plain text saja. Dilarang markdown: jangan pakai **, __, ##, atau asterisk bold di isi JSON.

FORMAT OUTPUT 'formal' (WAJIB ikuti struktur persis ini, TANPA markdown):

[Jenis properti] di [Nama perumahan/area], [Kota/Kecamatan] – [Harga]

[HOOK: 1 kalimat pembuka yang menarik perhatian. Pertanyaan atau pernyataan kuat. Sertakan area atau harga.]

[PROBLEM: 3-4 kalimat. Situasi pembeli yang relevan dengan data listing. Jangan klaim pasar, kompetitor, atau fasilitas yang tidak tertulis.]

[SOLUTION: 2-3 kalimat memperkenalkan listing ini sebagai jawaban, lalu blok di bawah.]

Spesifikasi: [KT, KM, LT, LB, lebar muka, listrik, air, legalitas, dipisah koma]

Akses terdekat: [Tempat + waktu tempuh, urut dari yang terdekat]

Pembayaran: [Metode]. Survey: [Aturan survey].

[CTA: 1-2 kalimat ajak hubungi / chat / survey. Sebut aturan survey jika ada.]

Catatan: [Opsional, hanya jika ada keterbatasan]

FORMAT OUTPUT 'pas' (Problem-Agitate-Solution, voice Marketing 3.0/4.0):

[Hook satu baris: pertanyaan atau pernyataan hidup, pakai kamu]

[Problem + Agitate, 3-4 kalimat situasi sehari-hari]

[Transisi ke solusi + jenis properti di area – harga, satu-dua kalimat]

[Fakta terkuat dalam 2-3 kalimat: KT/KM/luas, akses, cara bayar]

[CTA: ajak chat/DM untuk survey. Sebut aturan survey jika ada.]

FORMAT OUTPUT 'short' (Instagram Story / WhatsApp Status, voice Marketing 2.0/4.0):

[Hook percakapan: kamu + harga atau area]

[1-3 baris fakta terkuat, bukan daftar spek kaku]

[CTA: ajak DM/chat untuk survey, sebut aturan survey jika ada]

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

    return `Buat 3 deskripsi dari data listing berikut, dengan struktur berbeda. Plain text, jangan pakai **.

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
Nada: ramah dan profesional, tanpa emoji. Untuk portal dan website. Plain text, tanpa markdown.
Wajib Hook → Problem → Solution → CTA. Jangan singkat. Minimal 4 paragraf isi.
Format:
[Jenis properti] di [Nama perumahan/area], [Kota/Kecamatan] – [Harga]

[HOOK 1 kalimat]

[PROBLEM 3-4 kalimat]

[SOLUTION 2-3 kalimat + blok spesifikasi]

Spesifikasi: [KT, KM, LT, LB, lebar muka, listrik, air, legalitas, dipisah koma]

Akses terdekat: [Tempat + waktu tempuh]

Pembayaran: [Metode]. Survey: [Aturan survey].

[CTA 1-2 kalimat ajak hubungi / survey]

Catatan: [Opsional, keterbatasan relevan]
[[/FORMAL]]

[[PAS]]
Voice Marketing 3.0/4.0: human-centric, percakapan kamu/kita, cerita hidup sehari-hari. Bukan dump spek, bukan template kaku. Emoji maksimal 3. Untuk Instagram, Facebook, WhatsApp broadcast.
Struktur Problem, Agitate, Solution dalam prosa:
- Pilih SATU masalah pembeli yang paling cocok dengan keunggulan terkuat listing. Jangan menumpuk masalah.
- Problem dan Agitate boleh bersifat umum (pagi, pulang, keluarga, weekend), tapi tidak boleh berisi klaim faktual palsu tentang pasar, kompetitor, atau properti lain.
- Spek dan akses dijalin ke kalimat, jangan bullet "- Spesifikasi:".
Format:
[Hook satu baris: pertanyaan atau pernyataan hidup, pakai kamu]

[Problem + Agitate, 3-4 kalimat situasi sehari-hari]

[Transisi ke solusi + jenis properti di area – harga, satu-dua kalimat]

[Fakta terkuat dalam 2-3 kalimat: KT/KM/luas, akses, cara bayar]

[CTA: ajak chat/DM untuk survey. Sebut aturan survey jika ada.]
[[/PAS]]

[[SHORT]]
Voice Marketing 2.0/4.0: punchy, percakapan, ajak klik. Santai tapi sopan. Caption Instagram. Maksimal 600 karakter tidak termasuk hashtag, emoji maksimal 4. Hook maksimal 100 karakter dan wajib memuat harga atau area. Pilih 3-4 fakta terkuat. Jangan CTA kaku "Klik link di bio & hubungi kami".
Format:
[Hook percakapan: kamu + harga atau area]

[1-3 baris fakta terkuat, bukan daftar spek kaku]

[CTA: ajak DM/chat untuk survey, sebut aturan survey jika ada]

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
  private extractListingFacts(listing: Listing): {
    extraSpecs: string[];
    sellingPoints: string;
    caraBayar: string;
    surveyRules: string;
    catatan: string;
  } {
    const raw = listing.additional_info || '';
    const extraSpecs: string[] = [];
    let sellingPoints = '';
    let caraBayar = 'Cash & KPR';
    let surveyRules = 'Janjian satu hari sebelumnya';
    let catatan = '';

    const lebar = raw.match(/lebar muka\s*:?\s*(\d+)\s*(?:meter|m\b)/i);
    if (lebar) extraSpecs.push(`lebar muka ${lebar[1]} meter`);
    const garasi = raw.match(/garasi muat\s*(\d+)\s*mobil/i);
    if (garasi) extraSpecs.push(`garasi muat ${garasi[1]} mobil`);
    const carport = raw.match(/carport muat\s*(\d+)\s*mobil/i);
    if (carport) extraSpecs.push(`carport muat ${carport[1]} mobil`);

    const cbMatch = raw.match(/CARA BAYAR\s*:\s*([^\n\r]+)/i);
    if (cbMatch?.[1]) caraBayar = cbMatch[1].trim();
    const surMatch = raw.match(/SURVEY\s*:\s*([^\n\r]+)/i);
    if (surMatch?.[1]) surveyRules = surMatch[1].trim();
    const aksMatch = raw.match(/AKSES LOKASI\s*:\s*([^\n\r]+)/i);
    if (aksMatch?.[1]) catatan = `Akses lokasi: ${aksMatch[1].trim()}`;

    const spMatch = raw.match(/Selling Point(?:\s*&\s*Keunggulan)?\s*:?\s*([\s\S]*?)(?=\n(?:CARA BAYAR|AKSES LOKASI|SURVEY|Lokasi:)\b|$)/i);
    const accessBits: string[] = [];
    if (spMatch?.[1]) {
      const cleaned = spMatch[1]
        .split(/\n+/)
        .map((line) => line.replace(/^[\s•\-\t]+/, '').trim())
        .filter((line) => line && !/^(Lingkungan|Pemandangan|Fasilitas|Aksesibilitas)\b/i.test(line));
      for (const line of cleaned) {
        if (/\d+\s*menit|dekat|akses|UPI|Lembang|tol|kampus|wisata/i.test(line)) {
          accessBits.push(line.replace(/\s+/g, ' '));
        }
      }
      if (accessBits.length === 0 && cleaned.length) {
        sellingPoints = cleaned.slice(0, 3).join(', ');
      }
    }
    if (!accessBits.length) {
      const menit = raw.match(/[^\n•]*\d+\s*menit[^\n]*/gi) || [];
      for (const m of menit) {
        const t = m.replace(/^[\s•\-\t]+/, '').replace(/\s+/g, ' ').trim();
        if (t) accessBits.push(t);
      }
    }
    if (accessBits.length) {
      const bits = accessBits.slice(0, 3).map((s) => s.replace(/[.,;]+$/, ''));
      sellingPoints = bits.join('; ');
    }

    return { extraSpecs, sellingPoints, caraBayar, surveyRules, catatan };
  }

  private generateFallbackDescriptions(listing: Listing): GeneratedDescriptions {
    const typeTitle = this.getPropertyTypeLabel(listing.property_type);
    const compactPrice = this.formatCompactPrice(listing.price);
    const loc = listing.location || 'Bandung';
    const titleStr = listing.title || `${typeTitle} di ${loc}`;
    const facts = this.extractListingFacts(listing);
    const { extraSpecs, sellingPoints, caraBayar, surveyRules, catatan } = facts;

    const specsList: string[] = [];
    if (listing.bedrooms) specsList.push(`${listing.bedrooms} KT`);
    if (listing.bathrooms) specsList.push(`${listing.bathrooms} KM`);
    if (listing.land_area) specsList.push(`LT ${listing.land_area} m²`);
    if (listing.building_area) specsList.push(`LB ${listing.building_area} m²`);
    specsList.push(...extraSpecs);
    const specsStr = specsList.join(', ');

    const formalLines: string[] = [];
    formalLines.push(`${typeTitle} di ${loc} – ${compactPrice}\n`);
    formalLines.push(`Masih mencari ${typeTitle.toLowerCase()} siap huni di ${loc}?\n`);
    formalLines.push(`Mencari hunian yang kamarnya cukup, luasnya jelas, dan aksesnya tidak merepotkan sering berakhir di kompromi. Banyak listing tampak menarik di foto, tapi spesifikasi, cara bayar, atau aturan survey tidak dijelaskan. Pembeli yang gercep butuh data lengkap sebelum datang ke lokasi.\n`);
    formalLines.push(`${titleStr} menjawab kebutuhan itu. Hunian ini menawarkan spesifikasi yang tercatat di lokasi strategis ${loc}.\n`);
    if (specsStr) formalLines.push(`Spesifikasi: ${specsStr}`);
    if (sellingPoints) formalLines.push(`Akses terdekat: ${sellingPoints}`);
    formalLines.push(`Pembayaran: ${caraBayar}. Survey: ${surveyRules}.`);
    formalLines.push(`\nHubungi kami untuk jadwalkan survey. ${surveyRules}.`);
    if (catatan) formalLines.push(`\nCatatan: ${catatan}`);
    const formal = formalLines.join('\n');

    const pasLines: string[] = [];
    pasLines.push(`Kamu pulang malam, lalu masih pikir "rumah yang pas di ${loc} itu yang mana?"\n`);
    pasLines.push(`Banyak keluarga capek pindah-pindah. Yang dicari bukan listing kaku, tapi rumah yang jadi cerita hidup: pagi berangkat gampang, weekend dekat yang penting.\n`);
    pasLines.push(`${titleStr} di ${loc} – ${compactPrice}.`);
    if (specsStr) {
      pasLines.push(sellingPoints
        ? `${specsStr}. ${sellingPoints}. Cara bayar ${caraBayar}.`
        : `${specsStr}. Cara bayar ${caraBayar}.`);
    } else if (sellingPoints) {
      pasLines.push(`${sellingPoints}. Cara bayar ${caraBayar}.`);
    } else {
      pasLines.push(`Cara bayar ${caraBayar}.`);
    }
    pasLines.push(`\nSurvey: ${surveyRules}. Chat kami, kita atur jadwalnya.`);
    if (catatan) pasLines.push(`\nCatatan: ${catatan}`);
    const pas = pasLines.join('\n');

    const locClean = loc.replace(/\s+Bandung\s+Barat/i, '');
    const shortLines: string[] = [];
    shortLines.push(`${titleStr} di ${loc} – ${compactPrice}.`);
    shortLines.push(`\nBukan spek kaku. Ini rumah yang tinggal kamu isi cerita pagi-pagi.`);
    if (specsStr) shortLines.push(specsStr.replace(/,/g, ' ·'));
    if (sellingPoints) {
      const firstPoint = sellingPoints.split(',')[0]?.trim();
      if (firstPoint) shortLines.push(firstPoint);
    }
    shortLines.push(`Cara bayar ${caraBayar}.`);
    shortLines.push(`\nDM/chat kita untuk survey (${surveyRules}).`);
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