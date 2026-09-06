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
 * Post-process description output to ensure proper formatting
 */
function postProcessDescription(text: string): string {
  if (!text) return '';
  
  return text
    // Remove section marker labels ([HOOK], [PROBLEM], [SOLUTION], [CTA], [AGITATE])
    // so the copy reads as natural prose instead of an annotated template.
    .replace(/^\s*\[(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\]\s*:?\s*$/gim, '')
    .replace(/\[(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\]/gi, '')
    // Also strip {HOOK}, **HOOK**, Hook:, Problem:, Solution:, CTA:, Agitate: patterns
    .replace(/^\s*\*{0,2}(?:Hook|Problem|Agitate|Solution|CTA)\*{0,2}\s*:?\s*$/gim, '')
    .replace(/^\s*\{(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\}\s*:?\s*$/gim, '')
    .replace(/\{(?:HOOK|PROBLEM|AGITATE|SOLUTION|CTA)\}/gi, '')
    // Fix concatenated words that might slip through
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
  "formal": "Deskripsi listing portal profesional (OLX, Rumah123, dll). WAJIB mengikuti urutan 4 bagian yang jelas: (1) Hook: kalimat pembuka yang memancing perhatian seperti fakta unik atau scarcity. (2) Problem: nyatakan masalah yang dirasakan pencari rumah seperti harga terus naik atau susah cari unit siap huni. (3) Solution: presentasikan properti ini sebagai solusi dari masalah tersebut, sertakan detail spesifikasi, legalitas, dan harga. (4) CTA: ajakan bertindak yang jelas seperti \"Segera hubungi agen kami untuk jadwal survey\". Tone: profesional, berwibawa, dan meyakinkan. Tidak menggunakan emoji.",
  "casual_1": "Konten Instagram feed yang super shareable. Pakai framework PAS (Problem -> Agitate -> Solution -> CTA) dengan bumbu humor khas Indo, kedekatan emosional, dan relatable situation. Buka dengan pain point yang bikin orang ngangguk, agitate sampai berasa frustrasinya, reveal properti ini sebagai jalan keluar, push ke DM/WA. Tambahkan elemen yang bikin orang mau tag teman. 2-3 emoji yang relevan.",
  "casual_2": "Instagram Story / WhatsApp Status super singkat dan punchy, optimized untuk virality. Hook di kalimat pertama yang bikin orang stop scroll, satu-dua kalimat problem + solusi yang nyangkut di kepala, CTA yang urgent. Gaya bahasa Gen Z/Milenial Indo yang natural. 3-5 emoji yang pas."
}

Data listing yang WAJIB dipakai (jangan karang-karang fakta di luar data ini):
- Listing ID: ${listing.id}
- Target audience: mereka yang punya penghasilan cukup untuk DP 10% (sekitar Rp ${dpFormatted})

Aturan penulisan konten viral:
- NATURAL: hasil akhir harus berupa paragraf yang mengalir. JANGAN pernah mencantumkan label bagian seperti "[HOOK]", "[PROBLEM]", "[SOLUTION]", "[CTA]" (atau heading "Hook:", "Problem:", dll.) sebagai teks output. Transisi antar bagian cukup lewat alur kalimat dan paragraf baru.
- FORMATING & SPASI: WAJIB gunakan spasi yang benar antar kata, antar angka dan kata (contoh: "72 m²", "2 Kamar Tidur", bukan "72m²2Kamar"). Jika data input tempel/tanpa spasi, perbaiki menjadi kalimat ber-spasi rapi.
- HOOK: kalimat pembuka yang stop-scroll — pakai scarcity, lifestyle aspiration, price anchor, atau surprise fact
- EMOSI: sentuh rasa takut ketinggalan (FOMO), capek cari-cari, impian punya rumah sendiri, atau bangga sama lokasi strategis
- KEDEKATAN: pakai bahasa sehari-hari orang Indonesia, slang yang wajar (gercep, cuan, sultan, dll.), situasi relatable
- HUMOR: boleh pakai humor ringan yang bikin senyum — tapi jangan maksa
- SHAREABLE: konten casual harus punya elemen yang bikin orang mau share ke grup WA keluarga atau tag pasangan
- CTA: satu langkah jelas dan urgent ("WA sekarang", "DM untuk survey", "Tanya harga nego")
- HINDARI klise: jangan pakai "jangan lewatkan kesempatan emas", "investasi terbaik", "strategis" tanpa penjelasan konkret`;
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
   * Fallback generator when LLM API call fails or is unauthenticated
   */
  private generateFallbackDescriptions(listing: Listing): GeneratedDescriptions {
    const typeStr = listing.property_type ? listing.property_type : 'Properti';
    const capitalizedType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
    const titleStr = listing.title || `${capitalizedType} di ${listing.location}`;
    const priceFormatted = this.formatPrice(listing.price);
    const priceInMillionsOrBillions = listing.price >= 1000000000
      ? `${(listing.price / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Milyar`
      : `${(listing.price / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} Juta`;

    const specs: string[] = [];
    if (listing.land_area) specs.push(`Luas Tanah: ${listing.land_area}m²`);
    if (listing.building_area) specs.push(`Luas Bangunan: ${listing.building_area}m²`);
    if (listing.bedrooms) specs.push(`Kamar Tidur: ${listing.bedrooms}`);
    if (listing.bathrooms) specs.push(`Kamar Mandi: ${listing.bathrooms}`);
    const specSummary = specs.length > 0 ? specs.join(' | ') : '';

    const addInfo = listing.additional_info ? normalizeText(listing.additional_info) : '';

    const specSentence = [
      listing.land_area ? `tanah seluas ${listing.land_area} m²` : '',
      listing.building_area ? `bangunan seluas ${listing.building_area} m²` : '',
      listing.bedrooms ? `${listing.bedrooms} kamar tidur` : '',
      listing.bathrooms ? `${listing.bathrooms} kamar mandi` : '',
    ].filter(Boolean).join(', ');

    // Variant 1: FORMAL (natural Hook -> Problem -> Solution -> CTA prose for listing portals)
    const formal = `Hanya tersisa unit terbatas di kawasan ${listing.location} dengan harga mulai Rp ${priceFormatted} (${priceInMillionsOrBillions}). Properti di area ini jarang muncul di pasaran, jadi kesempatan untuk memiliki hunian di lokasi ini tidak datang dua kali.

Mencari ${typeStr} yang siap huni, legalitas jelas, dan harga masih masuk akal di ${listing.location} memang tidak mudah. Harga properti terus naik setiap tahun, sementara pilihan yang benar-benar berkualitas semakin langka. Banyak calon pembeli akhirnya menunda dan justru kehilangan peluang terbaik.

${titleStr} hadir sebagai jawaban atas kebutuhan tersebut.${specSentence ? `\n\nSpesifikasi ${typeStr}: ${specSentence}.` : ''}

Dengan harga penawaran Rp ${priceFormatted} (${priceInMillionsOrBillions}, nego), properti ini siap huni dan memiliki legalitas terjamin.${addInfo ? `\n\n${addInfo}` : ''}

Jangan sampai kehabisan. Segera hubungi agen kami untuk jadwal survey lokasi dan negosiasi harga — unit terbatas, siapa cepat dia dapat.`;

    // Variant 2: CASUAL #1 (Problem -> Agitate -> Solution -> CTA, Instagram feed)
    const casual_1 = `Capek cari ${typeStr} yang pas tapi selalu kalah cepat sama pembeli lain? 😩\n\nMakin lama nunggu, harga makin naik. Unit strategis makin jarang muncul. Apalagi lokasi ${listing.location} tuh incaran banyak orang — kalo nggak gercep, unit ini bakal laku sama orang lain. ⏳\n\nTenang, ${titleStr} jawabannya! ✨\n\n📍 ${listing.location}\n💰 Rp ${priceInMillionsOrBillions}\n✨ ${specSummary}\n${addInfo ? `📌 ${addInfo}\n\n` : ''}\nCocok banget buat tempat tinggal keluarga atau investasi. ${listing.bedrooms ? `${listing.bedrooms} KT` : ''}${listing.bathrooms ? ` ${listing.bathrooms} KM` : ''} — siap buat dihuni.\n\nDM atau WA sekarang buat survey lokasi! 📲`;

    // Variant 3: CASUAL #2 (Hook -> Problem -> Solution -> CTA, short story/status)
    const casual_2 = `🔥 ${titleStr} — unit strategis di ${listing.location}!\n\n${listing.bedrooms ? `🛌 ${listing.bedrooms} KT ` : ''}${listing.bathrooms ? `| 🛁 ${listing.bathrooms} KM ` : ''}${listing.land_area ? `| 📐 LT ${listing.land_area}m² ` : ''}${listing.building_area ? `| 🏗️ LB ${listing.building_area}m²` : ''}\n💰 Rp ${priceInMillionsOrBillions}\n\n${addInfo ? `${addInfo.slice(0, 150)}...\n\n` : ''}Lokasi begini cepat laku — jangan sampai kehabisan. Langsung WA/DM sekarang! 📲⚡`;

    return {
      formal: postProcessDescription(formal),
      casual_1: postProcessDescription(casual_1),
      casual_2: postProcessDescription(casual_2),
    };
  }
}

export default new DescriptionGeneratorService();