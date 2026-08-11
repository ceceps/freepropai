import llmClient from '../utils/llmClient';
import type { Listing, GeneratedDescriptions } from '../types';

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

      return response;
    } catch (error) {
      console.warn('⚠️ LLM generation failed, using template-based generator fallback:', error instanceof Error ? error.message : error);
      return this.generateFallbackDescriptions(listing);
    }
  }

  /**
   * Build system prompt for LLM - persuasive copywriting frameworks:
   * - formal   -> Hook -> Problem -> Solution -> CTA  (professional, listing portals)
   * - casual_1 -> Problem -> Agitate -> Solution -> CTA (PAS, Instagram feed)
   * - casual_2 -> Hook -> Problem -> Solution -> CTA   (short, story / WhatsApp)
   */
  private buildSystemPrompt(listing: Listing): string {
    let additionalInfo = '';
    if (listing.additional_info) {
      additionalInfo = `${listing.additional_info}`;
    }

    return `You are a senior copywriter for Indonesian real estate agents. Write 3 persuasive property description variants in Bahasa Indonesia using proven copywriting frameworks. The goal is to move the prospect to message the agent.

Return JSON format:
{
  "formal": "Professional listing-portal description following the framework Hook -> Problem -> Solution -> CTA. Show the urgency/value, the problem the buyer feels, how this property solves it with hard details, and end with a clear call to action. No emoji.",
  "casual_1": "Instagram feed post following the framework Problem -> Agitate -> Solution -> CTA (PAS). Open with a relatable pain point, agitate the frustration, present the property as the relief, then push to DM/WA. 2-3 emoji.",
  "casual_2": "Very short Instagram story / WhatsApp status following the framework Hook -> Problem -> Solution -> CTA. Punchy first line, quick problem + one-line solution, strong CTA. 3-5 emoji."
}

Facts to use (never invent numbers or features not listed): ${additionalInfo}
Property type, location, land area, building area, bedrooms, bathrooms, and price.

Framework rules:
- Hook: strong opening line that stops the scroll (e.g. scarcity, lifestyle, price anchor)
- Problem: the pain point the target buyer actually feels (searching is tiring, overpaying, location far, limited unit)
- Agitate (casual_1 only): make the frustration felt before revealing the solution
- Solution: present THIS property as the answer, with real specs and benefits
- CTA: one clear next step ("WA sekarang", "DM untuk survey", "Booking kunjungan hari ini") with contact urgency
- Keep it natural Bahasa Indonesia, avoid stiff translation, avoid clichés like "jangan lewatkan kesempatan emas"` +
      (additionalInfo ? `\nKey selling points:\n${additionalInfo}` : '');
  }

  /**
   * Build user prompt with listing details
   */
  private buildUserPrompt(listing: Listing): string {
    const parts: string[] = [];

    parts.push(`Create property descriptions for:`);
    parts.push(`Title: ${listing.title || 'Property'}`);
    parts.push(`Type: ${listing.property_type || 'Property'}`);
    parts.push(`Location: ${listing.location}`);

    if (listing.land_area) {
      parts.push(`Land: ${listing.land_area} m²`);
    }

    if (listing.building_area) {
      parts.push(`Building: ${listing.building_area} m²`);
    }

    if (listing.bedrooms) {
      parts.push(`Bedrooms: ${listing.bedrooms}`);
    }

    if (listing.bathrooms) {
      parts.push(`Bathrooms: ${listing.bathrooms}`);
    }

    parts.push(`Price: Rp ${this.formatPrice(listing.price)}`);

    if (listing.additional_info) {
      parts.push(`Additional info:\n${listing.additional_info}`);
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

    const addInfo = listing.additional_info ? listing.additional_info.trim() : '';

    // Variant 1: FORMAL (Hook -> Problem -> Solution -> CTA, for listing portals)
    const formal = `Temukan hunian yang selama ini Anda cari: ${titleStr} di ${listing.location}.${specSummary ? `\n\nSpesifikasi Properti:\n${specs.map(s => `- ${s}`).join('\n')}` : ''}\nHarga Penawaran: Rp ${priceFormatted} (${priceInMillionsOrBillions}, Nego).${addInfo ? `\n\n${addInfo}` : ''}\n\nUnit ini menjawab kebutuhan Anda akan hunian ${typeStr} yang strategis, legalitas terjamin, dan siap huni. Terbatasnya unit di area ini membuat properti seperti ini cepat berpindah tangan.\n\nSegera hubungi agen kami untuk jadwal survey lokasi dan negosiasi harga.`;

    // Variant 2: CASUAL #1 (Problem -> Agitate -> Solution -> CTA, Instagram feed)
    const casual_1 = `Capek cari ${typeStr} yang pas tapi selalu kalah cepat sama pembeli lain? 😩\n\nMakin lama nunggu, harga makin naik. Unit strategis makin jarang muncul. Apalagi lokasi ${listing.location} tuh incaran banyak orang — kalo nggak gercep, unit ini bakal laku sama orang lain. ⏳\n\nTenang, ${titleStr} jawabannya! ✨\n\n📍 ${listing.location}\n💰 Rp ${priceInMillionsOrBillions}\n✨ ${specSummary}\n${addInfo ? `📌 ${addInfo}\n\n` : ''}\nCocok banget buat tempat tinggal keluarga atau investasi. ${listing.bedrooms ? `${listing.bedrooms} KT` : ''}${listing.bathrooms ? ` ${listing.bathrooms} KM` : ''} — siap buat dihuni.\n\nDM atau WA sekarang buat survey lokasi! 📲`;

    // Variant 3: CASUAL #2 (Hook -> Problem -> Solution -> CTA, short story/status)
    const casual_2 = `🔥 ${titleStr} — unit strategis di ${listing.location}!\n\n${listing.bedrooms ? `🛌 ${listing.bedrooms} KT ` : ''}${listing.bathrooms ? `| 🛁 ${listing.bathrooms} KM ` : ''}${listing.land_area ? `| 📐 LT ${listing.land_area}m² ` : ''}${listing.building_area ? `| 🏗️ LB ${listing.building_area}m²` : ''}\n💰 Rp ${priceInMillionsOrBillions}\n\n${addInfo ? `${addInfo.slice(0, 150)}...\n\n` : ''}Lokasi begini cepat laku — jangan sampai kehabisan. Langsung WA/DM sekarang! 📲⚡`;

    return {
      formal,
      casual_1,
      casual_2,
    };
  }
}

export default new DescriptionGeneratorService();