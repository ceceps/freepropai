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
    // Insert space between letter and digit
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    // Insert space between digit and letter
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Insert space between ) and letter (e.g., "m²)Kamar" -> "m²) Kamar")
    .replace(/(\))([a-zA-Z])/g, '$1 $2')
    // Insert space between letter and ( (e.g., "Kamar(Closet" -> "Kamar (Closet")
    .replace(/([a-zA-Z])(\()/g, '$1 $2')
    // Insert space after : if followed by letter/number
    .replace(/(:)([a-zA-Z0-9])/g, '$1 $2')
    // Insert space after . if followed by uppercase (end of sentence)
    .replace(/(\.)([A-Z])/g, '$1 $2')
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
    // Fix concatenated words
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/(\.)([A-Z])/g, '$1 $2')
    // Fix spacing around punctuation
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/([.,;:])\s*/g, '$1 ')
    // Fix multiple spaces/newlines
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  cleaned = removeDuplicateParagraphs(cleaned);
  cleaned = removeDuplicatePrices(cleaned);

  // Clean up orphaned labels and repetitive sections from raw scraped additional_info
  cleaned = cleaned
    .replace(/Keunggulan:\s*(?:Detail:|Luas)/gi, '\n\nDetail:')
    .replace(/Detail:\s*\n\s*Detail:/gi, 'Detail:')
    .replace(/Lokasi([a-z])/gi, 'Lokasi: $1')
    .replace(/(Lokasi:\s*[^\n]+)\s*\n\s*Lokasi:\s*[^\n]+/gi, '$1')
    .trim();
  
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
          maxTokens: 2000,
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

    return `Kamu adalah copywriter properti untuk agen real estate di Bandung Raya (Bandung, Cimahi, Bandung Barat, Depok).

TUGAS:
Ubah data mentah listing menjadi 3 variasi deskripsi iklan yang rapi dan siap posting.

Return ONLY valid JSON format (no markdown code fence, no explanation):
{
  "formal": "Deskripsi formal sesuai FORMAT OUTPUT KETAT di bawah.",
  "casual_1": "Konten Instagram feed shareable (Problem -> Agitate -> Solution -> CTA) dengan humor/kedekatan khas Indo. Sebutkan harga HANYA SEKALI. 2-3 emoji.",
  "casual_2": "Instagram Story / WhatsApp Status super singkat dan punchy. Sebutkan harga HANYA SEKALI. 3-5 emoji."
}

ATURAN KETAT UNTUK VARIANT 'formal':
1. Gunakan HANYA fakta yang ada di data. Jangan menambah fasilitas, jarak, atau klaim yang tidak tertulis (misalnya 'banjir bebas', 'investasi menguntungkan').
2. Jika data tidak ada, lewati barisnya. Jangan menebak.
3. Pertahankan istilah asli dari data (misalnya 'SHM on hand', 'sibel komplek'), jangan diubah artinya.
4. Ubah harga jadi format singkat (contoh: 575000000 -> 'Rp575 Juta', 1800000000 -> 'Rp1,8 Miliar'). Harga properti ini: ${compactPrice}.
5. Bahasa Indonesia, nada ramah dan profesional, tanpa emoji, tanpa kata berlebihan seperti 'termurah' atau 'dijamin'.
6. Bagian pembuka maksimal 2 kalimat. Sebut kedekatan utama (sekolah, tol, pusat belanja) dan siapa yang cocok membeli (misalnya keluarga muda), hanya jika didukung data.
7. Jika ada keterbatasan yang relevan bagi pembeli (misalnya akses 1 mobil), tulis apa adanya di baris 'Catatan' secara netral.

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
    const dpAmount = Math.round(listing.price * 0.1);
    const dpFormatted = this.formatPrice(dpAmount);
    const priceFormatted = this.formatPrice(listing.price);
    const parts: string[] = [];

    parts.push(`Buatkan konten viral untuk listing properti berikut:`);
    parts.push(`Listing ID: ${listing.id}`);
    parts.push(`Judul: ${normalizeText(listing.title || 'Properti')}`);
    parts.push(`Tipe Properti: ${listing.property_type || 'Properti'}`);
    parts.push(`Lokasi: ${listing.location}`);

    if (listing.land_area) {
      parts.push(`Luas Tanah: ${listing.land_area} m²`);
    }

    if (listing.building_area) {
      parts.push(`Luas Bangunan: ${listing.building_area} m²`);
    }

    if (listing.bedrooms) {
      parts.push(`Kamar Tidur: ${listing.bedrooms}`);
    }

    if (listing.bathrooms) {
      parts.push(`Kamar Mandi: ${listing.bathrooms}`);
    }

    parts.push(`Harga: Rp ${priceFormatted}`);
    parts.push(`Target DP (10%): Rp ${dpFormatted}`);
    parts.push(`Target Audience: calon pembeli dengan penghasilan cukup untuk DP Rp ${dpFormatted}`);

    if (listing.additional_info) {
      parts.push(`Info Tambahan / Keunggulan Properti:\n${normalizeText(listing.additional_info)}`);
    }

    return parts.join('\n');
  }

  /**
   * Format price with thousand separators
   */
  private formatPrice(price: number): string {
    return price.toLocaleString('id-ID');
  }

  /**
   * Fallback generator when LLM API call fails - dynamic, no hardcoded templates
   */
  private generateFallbackDescriptions(listing: Listing): GeneratedDescriptions {
    const typeStr = listing.property_type || 'Properti';
    const titleStr = listing.title || `${typeStr} di ${listing.location}`;
    const priceFormatted = this.formatPrice(listing.price);
    const priceInMillionsOrBillions = listing.price >= 1000000000
      ? `${(listing.price / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Milyar`
      : `${(listing.price / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Juta`;

    const specParts: string[] = [];
    if (listing.land_area) specParts.push(`tanah ${listing.land_area} m²`);
    if (listing.building_area) specParts.push(`bangunan ${listing.building_area} m²`);
    if (listing.bedrooms) specParts.push(`${listing.bedrooms} kamar tidur`);
    if (listing.bathrooms) specParts.push(`${listing.bathrooms} kamar mandi`);
    const specSentence = specParts.join(', ');

    const specSummary = [
      listing.land_area ? `LT ${listing.land_area}m²` : '',
      listing.building_area ? `LB ${listing.building_area}m²` : '',
      listing.bedrooms ? `${listing.bedrooms} KT` : '',
      listing.bathrooms ? `${listing.bathrooms} KM` : '',
    ].filter(Boolean).join(' | ');

    const addInfo = listing.additional_info ? normalizeText(listing.additional_info) : '';

    const compactPrice = this.formatCompactPrice(listing.price);
    const typeTitle = this.getPropertyTypeLabel(listing.property_type);

    const specsList: string[] = [];
    if (listing.bedrooms) specsList.push(`${listing.bedrooms} KT`);
    if (listing.bathrooms) specsList.push(`${listing.bathrooms} KM`);
    if (listing.land_area) specsList.push(`LT ${listing.land_area} m²`);
    if (listing.building_area) specsList.push(`LB ${listing.building_area} m²`);

    const formalLines: string[] = [];
    formalLines.push(`**${typeTitle} di ${listing.location} – ${compactPrice}**\n`);
    formalLines.push(`${titleStr}. Hunian nyaman di lokasi strategis ${listing.location}.\n`);
    if (specsList.length > 0) {
      formalLines.push(`**Spesifikasi:** ${specsList.join(', ')}`);
    }
    if (addInfo) {
      formalLines.push(`\n${addInfo}`);
    }
    const formal = formalLines.join('\n');

    // Variant 2: CASUAL #1 - dynamic PAS, no template hooks
    const hooks = [
      `Mencari ${typeStr.toLowerCase()} di ${listing.location} tapi selalu kelewat?`,
      `Lagi cari hunian di ${listing.location}? Yang bagus cepat laku.`,
      `Butuh ${typeStr.toLowerCase()} strategis? Ini dia.`,
    ];
    const hook = hooks[Math.floor(Math.random() * hooks.length)];

    const agitates = [
      `Harga makin naik, unit bagus makin jarang. Kalo nggak gercep, nanti laku sama orang lain.`,
      `Pasar properti ${listing.location} memang nggak nungguin siapa pun. Unit premium kayak gini laku cepet banget.`,
      `Lokasi incaran banyak orang — kalo terlalu lama mikir, peluangnya ilang.`,
    ];
    const agitate = agitates[Math.floor(Math.random() * agitates.length)];

    const solutions = [
      `${titleStr} jawabannya! Lokasi premium, spesifikasi lengkap, harga wajar.`,
      `Tenang, ${titleStr} cocok banget buat kamu. ${specSummary} — siap huni.`,
      `Solusinya ${titleStr}. Strategis, legal, dan ${specSummary}.`,
    ];
    const solution = solutions[Math.floor(Math.random() * solutions.length)];

    const ctas = [
      'DM atau WA sekarang buat survey lokasi!',
      'Langsung hubungi agen kami untuk jadwal viewing!',
      'Klik tombol kontak di bawah untuk informasi detail!',
    ];
    const cta = ctas[Math.floor(Math.random() * ctas.length)];

    const casual_1 = `${hook} 😩\n\n${agitate} ⏳\n\n${solution} ✨\n\n📍 ${listing.location}\n💰 Rp ${priceInMillionsOrBillions}\n✨ ${specSummary}\n${addInfo ? `📌 ${addInfo}\n\n` : ''}${cta} 📲`;

    // Variant 3: CASUAL #2 - short punchy story/status
    const casual_2 = `🔥 ${titleStr} — unit strategis di ${listing.location}!\n\n${specSummary}\n💰 Rp ${priceInMillionsOrBillions}\n\n${addInfo ? `${addInfo.slice(0, 150)}...\n\n` : ''}Lokasi begini cepat laku — jangan sampai kehabisan. ${cta} 📲⚡`;

    return {
      formal: postProcessDescription(formal),
      casual_1: postProcessDescription(casual_1),
      casual_2: postProcessDescription(casual_2),
    };
  }
}

export default new DescriptionGeneratorService();