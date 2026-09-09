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

  /**
   * Build system prompt for LLM - viral content strategist persona:
   * - formal   -> viral listing-portal copy strictly Hook -> Problem -> Solution -> CTA
   * - casual_1 -> shareable Instagram feed post (PAS + Indo humor/kedekatan)
   * - casual_2 -> punchy Instagram story / WhatsApp status (max virality)
   */
  private buildSystemPrompt(listing: Listing): string {
    const dpAmount = Math.round(listing.price * 0.1);
    const dpFormatted = this.formatPrice(dpAmount);
    const priceFormatted = this.formatPrice(listing.price);

    return `Bertindaklah sebagai viral content strategist yang sudah membantu banyak brand di industri properti/real estate di Indonesia dapatkan jutaan views dan share organik. Tugas kamu adalah bikin ide konten viral untuk penjualan rumah berdasarkan listing ID: ${listing.id}, yang cocok untuk audience yang memiliki penghasilan cukup untuk DP 10% dari harga properti (DP sekitar Rp ${dpFormatted} dari harga Rp ${priceFormatted}). Gunakan gaya tone, dan optimalkan emosi, kedekatan, humor khas Indo, dan faktor 'shareable'-nya.

Buat 3 variasi konten dalam Bahasa Indonesia yang natural dan viral:

Return ONLY valid JSON format (no markdown, no explanation):
{
  "formal": "Deskripsi listing portal profesional (OLX, Rumah123, dll). WAJIB mengikuti urutan 4 bagian yang jelas: (1) Hook: kalimat pembuka yang memancing perhatian seperti fakta unik atau scarcity. JANGAN sebut harga di Hook. (2) Problem: nyatakan masalah yang dirasakan pencari rumah. (3) Solution: presentasikan properti ini sebagai solusi, sertakan spesifikasi dan legalitas. (4) CTA: ajakan bertindak yang jelas. Sebutkan harga HANYA SEKALI di bagian Solution. Tone: profesional dan meyakinkan. Tidak menggunakan emoji.",
  "casual_1": "Konten Instagram feed yang super shareable. Pakai framework PAS (Problem -> Agitate -> Solution -> CTA) dengan bumbu humor khas Indo. JANGAN PERNAH gunakan kalimat pembuka klise seperti 'Capek cari rumah...'. Bikin kalimat pembuka Hook yang bervariasi, unik, dan kontekstual sesuai dengan properti ini. Sebutkan harga HANYA SEKALI. 2-3 emoji yang relevan.",
  "casual_2": "Instagram Story / WhatsApp Status super singkat dan punchy. Sebutkan harga HANYA SEKALI. 3-5 emoji yang pas."
}

Data listing yang WAJIB dipakai (jangan karang-karang fakta di luar data ini):
- Listing ID: ${listing.id}
- Target audience: mereka yang punya penghasilan cukup untuk DP 10% (sekitar Rp ${dpFormatted})

ATURAN KETAT - pelanggaran akan menghasilkan deskripsi yang buruk:
- HARGA SEKALI SAJA: Harga properti WAJIB disebutkan HANYA SEKALI di seluruh deskripsi, yaitu di bagian Solution/Solusi. JANGAN menyebut harga di Hook, di Problem, atau di CTA.
- NO DUPLICATE: JANGAN mengulang kalimat, paragraf, atau informasi yang sudah disebutkan. Setiap kalimat harus memberikan informasi BARU.
- NATURAL: hasil akhir harus berupa paragraf yang mengalir. JANGAN mencantumkan label "[HOOK]", "[PROBLEM]" dll sebagai teks output.
- FORMATING & SPASI: WAJIB gunakan spasi yang benar antar kata (contoh: "72 m²", "2 Kamar Tidur").
- HOOK: kalimat pembuka yang stop-scroll tanpa menyebut harga.
- CTA: satu langkah jelas dan urgent ("Hubungi agen kami", "DM untuk survey")
- HINDARI klise: jangan pakai "jangan lewatkan kesempatan emas" atau "investasi terbaik"`;
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

    // Variant 1: FORMAL - dynamic Hook/Problem/Solution/CTA
    const formal = `Unit terbatas di kawasan ${listing.location} — properti premium jarang muncul di pasaran ini, peluang seperti ini tidak datang dua kali.

Mencari ${typeStr} berkualitas di ${listing.location} dengan legalitas jelas dan lokasi strategis memang tantangan tersendiri. Harga properti terus melonjak setiap tahun, sementara pilihan yang benar-benar layak huni semakin terbatas. Banyak calon pembeli yang menunda keputusan akhirnya kehilangan unit terbaik.

${titleStr} hadir menjawab kebutuhan tersebut dengan ${specSentence}. Properti ini dipasarkan dengan harga penawaran Rp ${priceFormatted} (${priceInMillionsOrBillions}, nego), siap huni dan memiliki legalitas terjamin.${addInfo ? `\n\nKeunggulan:\n${addInfo}` : ''}

Segera hubungi agen kami untuk jadwal survey lokasi dan negosiasi harga — unit terbatas, siapa cepat dia dapat.`;

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