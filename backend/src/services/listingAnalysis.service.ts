import llmClient from '../utils/llmClient';
import type { Listing } from '../types';

export interface ListingAnalysis {
  buyerPersonas: {
    name: string;
    description: string;
    characteristics: string[];
  }[];
  targetMarket: {
    segment: string;
    profile: string;
  }[];
  marketingChannels: {
    channel: string;
    reasoning: string;
    tactics: string[];
  }[];
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function formatPrice(price: number): string {
  return price.toLocaleString('id-ID');
}

export class ListingAnalysisService {
  async analyze(listing: Listing): Promise<ListingAnalysis> {
    const systemPrompt = this.buildSystemPrompt(listing);
    const userPrompt = this.buildUserPrompt(listing);

    try {
      console.log('[ListingAnalysis] Calling LLM...');
      const response = await llmClient.generateJSON<ListingAnalysis>(
        systemPrompt,
        userPrompt,
        { temperature: 0.6, maxTokens: 2000 }
      );

      if (!response.buyerPersonas || !response.targetMarket || !response.marketingChannels) {
        throw new Error('Invalid response structure from LLM');
      }

      console.log('[ListingAnalysis] LLM response received');
      return response;
    } catch (error) {
      console.warn('[ListingAnalysis] LLM failed, using fallback:', error instanceof Error ? error.message : error);
      return this.generateFallback(listing);
    }
  }

  private buildSystemPrompt(listing: Listing): string {
    const priceFormatted = formatPrice(listing.price);

    return `You are a senior property marketing strategist in Indonesia. Analyze the following property listing and provide a comprehensive market analysis.

Analyze the listing based on:
- Description and selling points
- Price point: Rp ${priceFormatted}
- Property specifications
- Location advantages

Return ONLY valid JSON format (no markdown, no explanation):
{
  "buyerPersonas": [
    {
      "name": "Persona name (e.g., 'Young Professional Family')",
      "description": "Brief description of this buyer persona",
      "characteristics": ["Characteristic 1", "Characteristic 2", "Characteristic 3"]
    }
  ],
  "targetMarket": [
    {
      "segment": "Market segment name",
      "profile": "Profile description of this segment"
    }
  ],
  "marketingChannels": [
    {
      "channel": "Channel name (e.g., 'Instagram', 'Property Portals', 'WhatsApp Groups')",
      "reasoning": "Why this channel works for this property",
      "tactics": ["Tactic 1", "Tactic 2"]
    }
  ]
}

Rules:
- Provide 3-4 buyer personas based on the property characteristics
- Identify 3-5 target market segments
- Recommend 4-5 marketing channels with specific tactics
- All content must be in Bahasa Indonesia
- Focus on practical, actionable insights
- Consider Indonesian property market behavior`;
  }

  private buildUserPrompt(listing: Listing): string {
    const priceFormatted = formatPrice(listing.price);
    const parts: string[] = [];

    parts.push(`Analisis properti berikut:`);
    parts.push(`Judul: ${normalizeText(listing.title || 'Properti')}`);
    parts.push(`Tipe: ${listing.property_type || 'Properti'}`);
    parts.push(`Lokasi: ${listing.location}`);

    if (listing.land_area) parts.push(`Luas Tanah: ${listing.land_area} m²`);
    if (listing.building_area) parts.push(`Luas Bangunan: ${listing.building_area} m²`);
    if (listing.bedrooms) parts.push(`Kamar Tidur: ${listing.bedrooms}`);
    if (listing.bathrooms) parts.push(`Kamar Mandi: ${listing.bathrooms}`);

    parts.push(`Harga: Rp ${priceFormatted}`);

    if (listing.additional_info) {
      parts.push(`Info Tambahan:\n${normalizeText(listing.additional_info)}`);
    }

    return parts.join('\n');
  }

  private generateFallback(listing: Listing): ListingAnalysis {
    const priceRange = listing.price >= 1000000000 ? 'premium' : listing.price >= 500000000 ? 'mid-high' : 'affordable';

    return {
      buyerPersonas: [
        {
          name: 'Keluarga Muda',
          description: `Keluarga muda dengan penghasilan ${priceRange === 'premium' ? 'tinggi' : 'menengah'} yang mencari hunian pertama atau upgrade dari apartemen`,
          characteristics: ['Usia 28-40 tahun', 'Berpenghasilan stabil', 'Mencari hunian nyaman', 'Memperhatikan lokasi dan fasilitas'],
        },
        {
          name: 'Investor Properti',
          description: `Investor yang mencari properti untuk disewakan atau dijual kembali dalam jangka menengah`,
          characteristics: ['Fokus pada ROI', 'Mempertimbangkan lokasi strategis', 'Mengutamakan potensi appreciation', 'Peka terhadap harga pasar'],
        },
        {
          name: 'Ekspatriat',
          description: `Ekspatriat yang bekerja di Indonesia dan mencari hunian dengan fasilitas lengkap`,
          characteristics: ['Mencari lingkungan internasional', 'Membutuhkan akses mudah', 'Mengutamakan keamanan', 'Budget lebih fleksibel'],
        },
      ],
      targetMarket: [
        {
          segment: 'Premium End Users',
          profile: `Pembeli langsung dengan budget ${priceRange === 'premium' ? 'di atas Rp 1 Miliar' : 'Rp 500 Juta - 1 Miliar'} yang mengutamakan kualitas hidup dan lokasi premium`,
        },
        {
          segment: 'Young Professionals',
          profile: `Profesional muda berusia 25-35 tahun dengan penghasilan kombinasi yang mencari hunian strategis dekat pusat bisnis`,
        },
        {
          segment: 'Small Families',
          profile: `Keluarga kecil (1-2 anak) yang membutuhkan ruang lebih luas dari apartemen dengan tetap dekat dengan fasilitas pendidikan dan kesehatan`,
        },
      ],
      marketingChannels: [
        {
          channel: 'Instagram',
          reasoning: 'Visual yang kuat untuk menampilkan kemewahan properti dan lokasi strategis',
          tactics: ['Post foto-foto properti berkualitas tinggi', 'Reels virtual tour', 'Stories behind the scenes', 'Highlight spesifikasi properti'],
        },
        {
          channel: 'Property Portals',
          reasoning: 'Target market yang actively searching properti di platform khusus',
          tactics: ['Listing di Rumah123 dan OLX', 'SEO untuk keyword lokasi', 'Virtual tour 360', 'Detail spesifikasi lengkap'],
        },
        {
          channel: 'WhatsApp Business',
          reasoning: 'Komunikasi langsung dan personal dengan calon pembeli',
          tactics: ['Broadcast list qualified leads', 'Katalog properti', 'Quick response service', 'Follow-up otomatis'],
        },
        {
          channel: 'Google Ads',
          reasoning: 'Target market yang aktif mencari properti di Google',
          tactics: ['Search ads keyword lokasi', 'Display ads properti', 'Retargeting website visitors', 'Landing page khusus properti'],
        },
        {
          channel: 'LinkedIn',
          reasoning: 'Jangkauan profesional dan ekspatriat yang mencari hunian',
          tactics: ['Post konten properti premium', 'Targeting lokasi dan profesi', 'Artikel tentang investasi properti', 'Networking dengan broker internasional'],
        },
      ],
    };
  }
}

export const listingAnalysisService = new ListingAnalysisService();