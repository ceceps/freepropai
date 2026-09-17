import { llmClient } from '../utils/llmClient';
import {
  contentCalendar,
  getPipelineDb,
  getPipelineWriteDb,
  pipelineListings,
} from '../db/pipeline';
import { eq, sql } from 'drizzle-orm';

export type ContentType =
  | 'aboutus'
  | 'generalposting'
  | 'pricing'
  | 'productshowcase'
  | 'promotion'
  | 'promotionseasonal'
  | 'spec'
  | 'testimonial';

export type Platform = 'instagram_feed' | 'instagram_carousel' | 'instagram_story' | 'tiktok' | 'youtube_shorts';

interface ListingContext {
  id: string;
  title: string;
  propertyType: string;
  location: string;
  price: number;
  landArea?: number;
  buildingArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  features?: string[];
  agentName?: string;
  agency?: string;
}

interface GeneratedHook {
  hook: string;
  captionDraft: string;
  platform: Platform;
  contentType: ContentType;
  disclosureTags?: string[];
}

const CONTENT_TYPE_SYSTEM_PROMPTS: Record<ContentType, string> = {
  aboutus: `Kamu adalah copywriter real estate yang menulis konten "About Us" untuk agen/agen properti.
Tugas: Buat hook (kalimat pembuka 1 baris) + caption draft (2-3 paragraf) yang memperkenalkan agen/agen properti secara personal, kredibel, dan relatable.
Gaya: Hangat, profesional, personal, storytelling. Hindari jargon korporat.
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#aboutus", "#agentlife", "#realestateindonesia"] }`,

  generalposting: `Kamu adalah copywriter real estate yang menulis konten "General Posting" untuk feed Instagram/TikTok.
Tugas: Buat hook + caption draft yang engaging, informatif, dan mendorong engagement (komentar/share/save).
Gaya: Kasual, relatable, pakai framework AIDA atau PAS, 2-3 emoji relevan. Hook harus unik & kontekstual (bukan template).
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#propertitips", "#hunianidaman", "#realestateindonesia"] }`,

  pricing: `Kamu adalah copywriter real estate yang menulis konten "Pricing" / harga properti.
Tugas: Buat hook + caption draft yang membahas harga/transparansi/nilai investasi tanpa terkesan "menjual keras". Fokus pada value & peluang.
Gaya: Edukatif, transparan, data-driven. Hindari clickbait harga murah.
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#hargaproperti", "#investasiproperti", "#realestateindonesia"] }`,

  productshowcase: `Kamu adalah copywriter real estate yang menulis konten "Product Showcase" — vitrin properti.
Tugas: Buat hook + caption draft yang memamerkan properti ini sebagai "hero" — spesifik, visual, bikin orang mau viewing.
Gaya: Visual-first, spesifik detail (LT/LB/KT/KM), story-telling lokasi. Hook harus spesifik ke properti INI (bukan generik).
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#propertishowcase", "#rumahdijual", "#hunianbaru"] }`,

  promotion: `Kamu adalah copywriter real estate yang menulis konten "Promotion" — promo/penawaran khusus.
Tugas: Buat hook + caption draft yang komunikasikan promo/insentif (diskon, cashback, free legal, dll) dengan urgency tapi tidak manipulatif.
Gaya: Jelas benefit-nya, deadline nyata, CTA kuat. Hindari "terbatas" kalau tidak benar.
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#promoproperti", "#diskonrumah", "#realestateindonesia"] }`,

  promotionseasonal: `Kamu adalah copywriter real estate yang menulis konten "Promosi Musiman" — momentum Lebaran, Akhir Tahun, Back to School, dll.
Tugas: Buat hook + caption draft yang mengaitkan properti dengan momen musiman secara natural & relevan.
Gaya: Hangat, timely, relatable. Hook mengaitkan momen + properti.
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#promomusiman", "#lebaran", "#hunianbaru"] }`,

  spec: `Kamu adalah copywriter real estate yang menulis konten "Spec" — fokus spesifikasi teknis properti.
Tugas: Buat hook + caption draft yang highlight spesifikasi unggulan (legalitas, sertifikat, material, smart home, dll) sebagai keunggulan kompetitif.
Gaya: Teknis tapi mudah dipahami, credible, trust-building. Hook menyinggung pain point spesifikasi.
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#spekproperti", "#legalitasproperti", "#realestateindonesia"] }`,

  testimonial: `Kamu adalah copywriter real estate yang menulis konten "Testimonial" — suara klien/pembeli.
Tugas: Buat hook + caption draft yang mengutip/parafrase testimoni nyata (atau tipe testimoni yang realistis) dengan format storytelling.
Gaya: Autentik, emosional, social proof. Hindari terkesan fabricated.
Output JSON: { "hook": "...", "captionDraft": "...", "disclosureTags": ["#testimoni", "#puasbelirumah", "#realestateindonesia"] }`,
};

function buildListingSummary(listing: ListingContext): string {
  const parts = [
    `Judul: ${listing.title}`,
    `Tipe: ${listing.propertyType}`,
    `Lokasi: ${listing.location}`,
    `Harga: Rp ${listing.price.toLocaleString('id-ID')}`,
  ];
  if (listing.landArea) parts.push(`LT: ${listing.landArea} m²`);
  if (listing.buildingArea) parts.push(`LB: ${listing.buildingArea} m²`);
  if (listing.bedrooms) parts.push(`KT: ${listing.bedrooms}`);
  if (listing.bathrooms) parts.push(`KM: ${listing.bathrooms}`);
  if (listing.features?.length) parts.push(`Fitur: ${listing.features.slice(0, 5).join(', ')}`);
  if (listing.agentName) parts.push(`Agen: ${listing.agentName}`);
  if (listing.agency) parts.push(`Agensi: ${listing.agency}`);
  return parts.join('\n');
}

export async function generateCalendarHooks(
  listing: ListingContext,
  contentTypes: ContentType[],
  platforms: Platform[] = ['instagram_feed', 'instagram_carousel', 'instagram_story', 'tiktok', 'youtube_shorts']
): Promise<GeneratedHook[]> {
  const listingSummary = buildListingSummary(listing);
  const results: GeneratedHook[] = [];

  // Generate in batches of 2 to avoid rate limits
  for (let i = 0; i < contentTypes.length; i += 2) {
    const batch = contentTypes.slice(i, i + 2);

    const promises = batch.map(async (contentType) => {
      const systemPrompt = CONTENT_TYPE_SYSTEM_PROMPTS[contentType];
      const userPrompt = `Berikut detail properti:\n${listingSummary}\n\nBuatkan 1 hook unik + caption draft untuk tipe konten "${contentType}". Pastikan hook spesifik ke properti ini, bukan template generik. Caption harus 2-3 paragraf pendek yang engaging.`;

      try {
        const response = await llmClient.generateJSON<{ hook: string; captionDraft: string; disclosureTags?: string[] }>(
          systemPrompt,
          userPrompt,
          { temperature: 0.8, maxTokens: 800 }
        );

        const platform = platforms[(results.length + batch.indexOf(contentType)) % platforms.length];

        return {
          hook: response.hook,
          captionDraft: response.captionDraft,
          platform,
          contentType,
          disclosureTags: response.disclosureTags,
        } as GeneratedHook;
      } catch (error) {
        console.error(`[CalendarGen] LLM failed for ${contentType}, using fallback:`, error);
        return {
          hook: generateFallbackHook(listing, contentType),
          captionDraft: generateFallbackCaption(listing, contentType),
          platform: platforms[(results.length + batch.indexOf(contentType)) % platforms.length],
          contentType,
          disclosureTags: getDefaultTags(contentType),
        } as GeneratedHook;
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  return results;
}

function generateFallbackHook(listing: ListingContext, contentType: ContentType): string {
  const hooks: Record<ContentType, string[]> = {
    aboutus: [
      `Kenalan sama ${listing.agentName || 'agen properti'} — partner terpercaya cari hunian impian di ${listing.location}.`,
      `Dari rumah pertama sampai investasi, ${listing.agentName || 'kami'} nemenin langkahmu.`,
    ],
    generalposting: [
      `${listing.title} — unit langka di ${listing.location}, spesifikasi istimewa yang jarang tersedia.`,
      `Mau beli rumah tapi bingung mulai dari mana? Ini panduan singkat yang wajib kamu tahu.`,
    ],
    pricing: [
      `Investasi properti di ${listing.location} — siapa cepat dia dapat.`,
      `Berapa sih harga rumah di ${listing.location} sekarang? Ini breakdown-nya.`,
    ],
    productshowcase: [
      `${listing.title}: ${listing.bedrooms || '3'}KT ${listing.bathrooms || '2'}KM di hati ${listing.location}.`,
      `Unit ini cuma 1. ${listing.title} — siap huni, legalitas jelas.`,
    ],
    promotion: [
      `Promo spesial bulan ini: free notaris + konsultasi hukum untuk pembeli ${listing.title}.`,
      `Cashback menarik untuk pembeli ${listing.title} — cek syarat & ketentuannya.`,
    ],
    promotionseasonal: [
      `Akhir tahun = momentum tepat beli properti. ${listing.title} siap jadi investasi.`,
      `Mudik lebaran? Sekalian survey ${listing.location} — promo spesial berlaku.`,
    ],
    spec: [
      `SHM lengkap, akses jalan strategis — ${listing.title} punya legalitas yang aman.`,
      `Material premium, desain modern. Ini yang bikin ${listing.title} beda dari yang lain.`,
    ],
    testimonial: [
      `"Prosesnya cepat, agennya sabar jelasin semua." — testimoni dari pembeli ${listing.title}.`,
      `"Legalitasnya jelas, nggak ada masalah. Recommended!" — Bpk. Ahmad, pemilik unit.`,
    ],
  };
  const arr = hooks[contentType] || hooks.generalposting;
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFallbackCaption(listing: ListingContext, contentType: ContentType): string {
  const title = listing.title || 'Properti Pilihan';
  const loc = listing.location || 'Lokasi Strategis';
  const specs = [
    listing.bedrooms && `${listing.bedrooms} KT`,
    listing.bathrooms && `${listing.bathrooms} KM`,
    listing.landArea && `LT ${listing.landArea}m²`,
    listing.buildingArea && `LB ${listing.buildingArea}m²`,
  ].filter(Boolean).join(', ');

  const captions: Record<ContentType, string> = {
    aboutus: `Kenalan lebih dekat dengan ${listing.agentName || 'agen properti'} — ${listing.agency || 'tim profesional'} yang berpengalaman membantu menemukan hunian impian di ${loc}. Berkomitmen memberikan pelayanan terbaik dan transparan kepada setiap klien.`,
    generalposting: `${title} — hunian idaman di ${loc}.\n\n${specs ? `Spesifikasi: ${specs}` : ''}\n${listing.price ? `Harga: Rp ${listing.price.toLocaleString('id-ID')}` : ''}\n\nDM untuk info lebih lanjut!`,
    pricing: `${title} — investasi properti di ${loc} dengan harga ${listing.price ? `Rp ${listing.price.toLocaleString('id-ID')}` : 'kompetitif'}. Legalitas jelas, proses aman. Cocok untuk hunian maupun investasi jangka panjang.`,
    productshowcase: `${title} — unit premium di ${loc}.\n\n${specs ? `Spesifikasi:\n${specs}` : ''}\n\n${listing.features?.length ? `Keunggulan:\n${listing.features.slice(0, 3).map(f => `- ${f}`).join('\n')}` : ''}\n\nHubungi agen untuk jadwal viewing.`,
    promotion: `Promo spesial ${title} — dapatkan penawaran terbaik bulan ini! Hubungi ${listing.agentName || 'agen kami'} untuk informasi lebih lanjut.`,
    promotionseasonal: `${title} — momentum tepat memiliki hunian impian. Hubungi kami untuk promo spesial musim ini.`,
    spec: `${title} — spesifikasi unggulan di ${loc}. Legalitas jelas, material premium, desain modern. Hubungi ${listing.agentName || 'agen kami'} untuk survei.`,
    testimonial: `Testimoni dari klien yang puas dengan pelayanan ${listing.agentName || 'agen kami'} dalam membeli ${title} di ${loc}. Kepercayaan Anda adalah prioritas kami.`,
  };

  return captions[contentType] || captions.generalposting;
}

function getDefaultTags(contentType: ContentType): string[] {
  const tags: Record<ContentType, string[]> = {
    aboutus: ['#aboutus', '#agentlife', '#realestateindonesia'],
    generalposting: ['#propertitips', '#hunianidaman', '#realestateindonesia'],
    pricing: ['#hargaproperti', '#investasiproperti', '#realestateindonesia'],
    productshowcase: ['#propertishowcase', '#rumahdijual', '#hunianbaru'],
    promotion: ['#promoproperti', '#diskonrumah', '#realestateindonesia'],
    promotionseasonal: ['#promomusiman', '#lebaran', '#hunianbaru'],
    spec: ['#spekproperti', '#legalitasproperti', '#realestateindonesia'],
    testimonial: ['#testimoni', '#puasbelirumah', '#realestateindonesia'],
  };
  return tags[contentType] || tags.generalposting;
}

export const contentTypeLabels: Record<ContentType, string> = {
  aboutus: 'About Us',
  generalposting: 'General Posting',
  pricing: 'Pricing / Harga',
  productshowcase: 'Product Showcase',
  promotion: 'Promotion',
  promotionseasonal: 'Promosi Musiman',
  spec: 'Spesifikasi',
  testimonial: 'Testimonial',
};

export const allContentTypes: ContentType[] = [
  'aboutus',
  'generalposting',
  'pricing',
  'productshowcase',
  'promotion',
  'promotionseasonal',
  'spec',
  'testimonial',
];

export const allPlatforms: Platform[] = [
  'instagram_feed',
  'instagram_carousel',
  'instagram_story',
  'tiktok',
  'youtube_shorts',
];

export const platformLabels: Record<Platform, string> = {
  instagram_feed: 'Instagram Feed',
  instagram_carousel: 'Instagram Carousel',
  instagram_story: 'Instagram Story',
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
};
