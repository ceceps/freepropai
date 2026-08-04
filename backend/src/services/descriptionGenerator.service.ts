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
    const systemPrompt = this.buildSystemPrompt();
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
   * Build system prompt for LLM - simplified to avoid content blocking
   */
  private buildSystemPrompt(): string {
    return `You are a helpful assistant for Indonesian real estate agents. Generate 3 property description variants in Indonesian language.

Return JSON format:
{
  "formal": "Professional description for listing websites",
  "casual_1": "Friendly Instagram post with 2-3 emoji",
  "casual_2": "Short casual message for stories with emoji"
}

Guidelines:
- Formal: Professional, complete details, no emoji
- Casual 1: Friendly tone, lifestyle benefits, 2-3 emoji
- Casual 2: Very short, conversational, 3-5 emoji`;
  }

  /**
   * Build user prompt with listing details
   */
  private buildUserPrompt(listing: Listing): string {
    const parts: string[] = [];

    parts.push(`Create property descriptions for:`);
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
      parts.push(`Info: ${listing.additional_info}`);
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

    // Variant 1: FORMAL (for listing portals)
    const formal = `Dijual ${titleStr}. Located di area strategis ${listing.location}.${specSummary ? `\n\nSpesifikasi Properti:\n${specs.map(s => `- ${s}`).join('\n')}` : ''}\nHarga Penawaran: Rp ${priceFormatted} (${priceInMillionsOrBillions}, Nego).${addInfo ? `\n\nKeterangan Tambahan:\n${addInfo}` : ''}\n\nUnit siap huni dan memiliki legalitas terjamin. Hubungi agen untuk informasi detail dan penjadwalan survey lokasi.`;

    // Variant 2: CASUAL #1 (for Instagram post)
    const casual_1 = `🏡 ${titleStr}!\n\n📍 Lokasi: ${listing.location}\n💰 Harga: Rp ${priceFormatted} (${priceInMillionsOrBillions} Nego)\n✨ ${specSummary}\n\n${addInfo ? `📌 Detail & Keunggulan:\n${addInfo}\n\n` : ''}Hunian idaman dengan fasilitas lengkap & akses super mudah! Cocok banget buat tempat tinggal keluarga maupun investasi properti. DM atau WA sekarang sebelum kehabisan! 📲✨`;

    // Variant 3: CASUAL #2 (for Instagram story / WhatsApp status)
    const casual_2 = `🔥 DIJUAL QUICK SALE! ${titleStr} di ${listing.location} 📍\n\n${listing.bedrooms ? `🛌 ${listing.bedrooms} KT ` : ''}${listing.bathrooms ? `| 🛁 ${listing.bathrooms} KM ` : ''}${listing.land_area ? `| 📐 LT ${listing.land_area}m² ` : ''}${listing.building_area ? `| 🏗️ LB ${listing.building_area}m²` : ''}\n💰 Rp ${priceInMillionsOrBillions}\n\n${addInfo ? `${addInfo.slice(0, 150)}...\n\n` : ''}Serius minat atau mau tanya-tanya dulu? Langsung WA/DM sekarang ya! 📲⚡`;

    return {
      formal,
      casual_1,
      casual_2,
    };
  }
}

export default new DescriptionGeneratorService();