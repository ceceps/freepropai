import { describe, it, expect, vi } from 'vitest';
import descriptionGeneratorService from '../services/descriptionGenerator.service';
import type { Listing } from '../types';

describe('DescriptionGeneratorService Unit Tests', () => {
  const sampleListing: Listing = {
    id: 'e0d4b91e-6f6e-4cdb-b488-a4355e63c6c5',
    title: 'Rumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol',
    description: 'Rumah 2 lantai readystock',
    property_type: 'rumah',
    price: 975000000,
    location: 'Ngamprah Bandung Barat',
    bedrooms: 3,
    bathrooms: 2,
    land_area: 72,
    building_area: 100,
    status: 'available',
    additional_info: `Harga: Rp975.000.000\nDetail:\nLuas Tanah: 72.00 m²\nLuas Bangunan: 100.00 m²\nKamar Tidur: 3\nKamar Mandi: 2\nDeskripsi:\nRumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol\nSpesifikasi:\n- Type Alocasia custom 100/72\n- 2 lantai\n- 3 kamar tidur\n- 2 kamar mandi\n- Dapur\n- Ruang keluarga\n- Carport\n- Halaman belakang\n- Rooftop\nPromo: Harga 975 juta nego\nSelling Point:\n- Lokasi sangat strategis dekat KCIC whoosh dan gerbang tol Padalarang dekat wisata Lembang\n- Dekat kantor Bupati KBB dan kantor DPRD KBB\nCARA BAYAR : CASH DAN KPR\nAKSES LOKASI : 2 MOBIL\nSURVEY : JANJIAN SATU HARI SEBELUMNYA`,
    source_url: 'https://www.acehome.co.id/project/detail/9f1c3ad7-d2b6-43e5-b641-eae0f5c9924e',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('should generate fallback descriptions matching required 3 variants when LLM fails or is offline', async () => {
    const result = await descriptionGeneratorService.generateDescriptions(sampleListing);

    expect(result).toHaveProperty('formal');
    expect(result).toHaveProperty('casual_1');
    expect(result).toHaveProperty('casual_2');

    // Check Formal variant rules
    expect(result.formal).toContain('Rumah di Ngamprah Bandung Barat');
    expect(result.formal).toContain('Rp975 Juta');
    expect(result.formal).toContain('Spesifikasi:');
    expect(result.formal).not.toMatch(/\p{Extended_Pictographic}/u); // No emojis in formal

    // Check Casual 1 (PAS) variant rules
    expect(result.casual_1).toContain('Ngamprah Bandung Barat');
    expect(result.casual_1).toContain('Rp975 Juta');

    // Check Casual 2 (SHORT) variant rules
    expect(result.casual_2).toContain('Ngamprah Bandung Barat');
    expect(result.casual_2).toContain('Rp975 Juta');
  });

  it('should correctly format compact price for millions and billions', () => {
    const formatCompactPrice = (descriptionGeneratorService as any).formatCompactPrice.bind(descriptionGeneratorService);
    
    expect(formatCompactPrice(575000000)).toBe('Rp575 Juta');
    expect(formatCompactPrice(975000000)).toBe('Rp975 Juta');
    expect(formatCompactPrice(1800000000)).toBe('Rp1,8 Miliar');
    expect(formatCompactPrice(25000000000)).toBe('Rp25 Miliar');
  });

  it('should construct user prompt containing exact listing ID data and output structure markers', () => {
    const buildUserPrompt = (descriptionGeneratorService as any).buildUserPrompt.bind(descriptionGeneratorService);
    const userPrompt = buildUserPrompt(sampleListing);

    expect(userPrompt).toContain('=== DATA LISTING ===');
    expect(userPrompt).toContain('Judul: Rumah Readystock Rooftop Dekat KCIC Whoosh Padalarang Dan Gerbang Tol');
    expect(userPrompt).toContain('Harga: Rp 975.000.000 (Rp975 Juta)');
    expect(userPrompt).toContain('Luas tanah: 72 m²');
    expect(userPrompt).toContain('Luas bangunan: 100 m²');
    expect(userPrompt).toContain('Link: https://www.acehome.co.id/project/detail/9f1c3ad7-d2b6-43e5-b641-eae0f5c9924e');
    expect(userPrompt).toContain('[[FORMAL]]');
    expect(userPrompt).toContain('[[PAS]]');
    expect(userPrompt).toContain('[[SHORT]]');
  });

  it('should construct system prompt containing strict fact rules and format rules', () => {
    const buildSystemPrompt = (descriptionGeneratorService as any).buildSystemPrompt.bind(descriptionGeneratorService);
    const systemPrompt = buildSystemPrompt(sampleListing);

    expect(systemPrompt).toContain('copywriter properti untuk agen real estate di Bandung Raya');
    expect(systemPrompt).toContain('ATURAN FAKTA (berlaku untuk semua versi):');
    expect(systemPrompt).toContain('ATURAN FORMAT & HARGA:');
    expect(systemPrompt).toContain('PERIKSA DATA: [alasan singkat]');
    expect(systemPrompt).toContain('FORMAT OUTPUT \'formal\'');
  });
});
