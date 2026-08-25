import { llmClient } from '../utils/llmClient';
import { db } from '../db';
import { leads } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface QualifyLeadInput {
  name?: string;
  phone?: string;
  rawChatText: string;
}

export interface QualifiedLeadData {
  name: string;
  phone: string;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  unitType?: string;
  urgency: 'immediate' | 'soon' | 'flexible';
  score: 'Hot' | 'Warm' | 'Cold';
  notes: string;
}

export class LeadQualifierService {
  /**
   * Qualify lead from raw chat using LLM and save to DB
   */
  async qualifyAndSaveLead(input: QualifyLeadInput) {
    const extracted = await this.extractAndQualify(input.rawChatText, input.name, input.phone);

    const [newLead] = await db.insert(leads).values({
      name: extracted.name || input.name || 'Unknown Lead',
      phone: extracted.phone || input.phone || '-',
      budgetMin: extracted.budgetMin ? String(extracted.budgetMin) : null,
      budgetMax: extracted.budgetMax ? String(extracted.budgetMax) : null,
      location: extracted.location || null,
      unitType: extracted.unitType || null,
      urgency: extracted.urgency,
      score: extracted.score,
      rawChatText: input.rawChatText,
      notes: extracted.notes,
      status: 'new',
    }).returning();

    return newLead;
  }

  /**
   * Use LLM to extract fields and calculate score
   */
  async extractAndQualify(rawChatText: string, defaultName?: string, defaultPhone?: string): Promise<QualifiedLeadData> {
    const prompt = `
Anda adalah AI Asisten Properti. Tugas Anda adalah mengekstrak informasi lead dari percakapan WhatsApp/Chat berikut, dan memberikan Scoring Lead (Hot, Warm, Cold).

Teks Chat:
"""
${rawChatText}
"""

Instruksi Ekstraksi & Scoring:
1. Name: Nama calon pembeli (jika ada).
2. Phone: Nomor telepon/WA (jika ada).
3. Budget Range: min & max budget dalam angka rupiah murni (contoh: 500000000). Jika "500jt - 1M", maka min: 500000000, max: 1000000000.
4. Location: Lokasi/area yang dicari calon pembeli.
5. Unit Type: Tipe properti (Rumah, Ruko, Tanah, Apartemen, dll).
6. Urgency: 'immediate' (butuh sangat cepat < 1 bulan / sudah ada DP), 'soon' (1-3 bulan), 'flexible' (> 3 bulan / sekedar tanya).
7. Score:
   - 'Hot': Budget jelas, lokasi spesifik, urgency immediate/soon, butuh survei segera.
   - 'Warm': Punya kriteria tapi urgency flexible atau budget belum pasti.
   - 'Cold': Cuma tanya-tanya, tidak jelas, atau budget sangat jauh dari realita.
8. Notes: Catatan singkat alasan scoring dan detail kebutuhan lead.

Kembalikan respon DALAM FORMAT JSON VALID TANPA MARKDOWN:
{
  "name": "string or null",
  "phone": "string or null",
  "budgetMin": number or null,
  "budgetMax": number or null,
  "location": "string or null",
  "unitType": "string or null",
  "urgency": "immediate" | "soon" | "flexible",
  "score": "Hot" | "Warm" | "Cold",
  "notes": "string"
}
`;

    try {
      const response = await llmClient.generateCompletion('Anda adalah asisten properti', prompt);
      // Clean JSON formatting
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        name: parsed.name || defaultName || 'Unknown Lead',
        phone: parsed.phone || defaultPhone || '-',
        budgetMin: parsed.budgetMin || undefined,
        budgetMax: parsed.budgetMax || undefined,
        location: parsed.location || undefined,
        unitType: parsed.unitType || undefined,
        urgency: parsed.urgency && ['immediate', 'soon', 'flexible'].includes(parsed.urgency) ? parsed.urgency : 'flexible',
        score: parsed.score && ['Hot', 'Warm', 'Cold'].includes(parsed.score) ? parsed.score : 'Warm',
        notes: parsed.notes || 'Di-extract dari chat',
      };
    } catch (error) {
      console.error('Failed to qualify lead via LLM:', error);
      // Fallback response
      return {
        name: defaultName || 'Unknown Lead',
        phone: defaultPhone || '-',
        urgency: 'flexible',
        score: 'Warm',
        notes: 'Ekstraksi otomatis gagal, perlu review manual.',
      };
    }
  }

  async getAllLeads() {
    return await db.select().from(leads).orderBy(leads.createdAt);
  }

  async getLeadById(id: string) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || null;
  }

  async updateLead(id: string, updateData: any) {
    const safeData: any = {};
    if (updateData.name !== undefined) safeData.name = updateData.name;
    if (updateData.phone !== undefined) safeData.phone = updateData.phone;
    if (updateData.budgetMin !== undefined) safeData.budgetMin = updateData.budgetMin !== null ? String(updateData.budgetMin) : null;
    if (updateData.budgetMax !== undefined) safeData.budgetMax = updateData.budgetMax !== null ? String(updateData.budgetMax) : null;
    if (updateData.location !== undefined) safeData.location = updateData.location;
    if (updateData.unitType !== undefined) safeData.unitType = updateData.unitType;
    if (updateData.urgency !== undefined) safeData.urgency = updateData.urgency;
    if (updateData.score !== undefined) safeData.score = updateData.score;
    if (updateData.notes !== undefined) safeData.notes = updateData.notes;
    if (updateData.status !== undefined) safeData.status = updateData.status;

    const [updated] = await db.update(leads)
      .set({ ...safeData, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updated || null;
  }

  async deleteLead(id: string) {
    const [deleted] = await db.delete(leads).where(eq(leads.id, id)).returning();
    return deleted || null;
  }
}

export const leadQualifierService = new LeadQualifierService();
