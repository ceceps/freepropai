import { llmClient } from '../utils/llmClient';
import { db } from '../db';
import { followUps, leads } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface GenerateFollowUpInput {
  leadId: string;
  contextMessage?: string;
  scheduledForDays?: number; // e.g. 1 day from now, 3 days from now
}

export class FollowUpSchedulerService {
  /**
   * Auto-generate a follow-up message using LLM and save to queue
   */
  async generateAndSchedule(input: GenerateFollowUpInput) {
    const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId));
    if (!lead) {
      throw new Error('Lead not found');
    }

    const draftMessage = await this.generateFollowUpMessage(lead, input.contextMessage);
    
    // Calculate default scheduled time (e.g. 1 day later or specified days)
    const days = input.scheduledForDays || 1;
    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + days);

    const [newFollowUp] = await db.insert(followUps).values({
      leadId: lead.id,
      messageDraft: draftMessage,
      scheduledFor,
      status: 'pending',
    }).returning();

    return newFollowUp;
  }

  /**
   * Use LLM to craft personalized WhatsApp follow-up message
   */
  async generateFollowUpMessage(lead: any, contextMessage?: string): Promise<string> {
    const prompt = `
Anda adalah AI Co-worker untuk agen properti. Tugas Anda adalah membuat draf pesan WhatsApp follow-up yang sopan, ramah, persuasif, dan tidak pushy untuk calon pembeli (lead).

Detail Lead:
- Nama: ${lead.name}
- Tipe Properti Diincar: ${lead.unitType || 'Properti'}
- Lokasi: ${lead.location || 'Batam/Indonesia'}
- Budget Range: ${lead.budgetMin ? 'Rp ' + lead.budgetMin : ''} - ${lead.budgetMax ? 'Rp ' + lead.budgetMax : 'Sesuai'}
- Level Urgency: ${lead.urgency}
- Catatan Kebutuhan: ${lead.notes || '-'}
- Konteks Tambahan: ${contextMessage || 'Menanyakan kelanjutan diskusikan properti atau tawaran unit baru yang sesuai.'}

Instruksi:
1. Tulis pesan santai, profesional, dan personal dalam bahasa Indonesia khas percakapan WhatsApp.
2. Sisipkan emoticon secukupnya agar ramah.
3. Gunakan placeholder [Nama Agen] jika menyebutkan nama sendiri.
4. JANGAN menyertakan penjelasan/intro lain, LANGSUNG BERIKAN TEKS PESAN WHATSAPP SAJA.
`;

    try {
      const response = await llmClient.generateCompletion('Anda adalah asisten properti', prompt);
      return response.trim();
    } catch (error) {
      console.error('Failed to generate follow up message:', error);
      return `Halo Kak ${lead.name}, mau menanyakan kembali terkait pencarian ${lead.unitType || 'properti'}-nya. Apakah ada waktu untuk ngobrol sebentar hari ini? Terima kasih!`;
    }
  }

  async getQueue() {
    const rows = await db.select({
      id: followUps.id,
      leadId: followUps.leadId,
      messageDraft: followUps.messageDraft,
      scheduledFor: followUps.scheduledFor,
      status: followUps.status,
      generatedAt: followUps.generatedAt,
      approvedAt: followUps.approvedAt,
      approvedBy: followUps.approvedBy,
      sentAt: followUps.sentAt,
      rejectionReason: followUps.rejectionReason,
      createdAt: followUps.createdAt,
      updatedAt: followUps.updatedAt,
      leadName: leads.name,
      leadPhone: leads.phone,
      leadLocation: leads.location,
      leadUnitType: leads.unitType,
      leadUrgency: leads.urgency,
      leadScore: leads.score,
      leadNotes: leads.notes,
    })
    .from(followUps)
    .innerJoin(leads, eq(followUps.leadId, leads.id))
    .orderBy(followUps.scheduledFor);

    return rows.map(({ leadName, leadPhone, leadLocation, leadUnitType, leadUrgency, leadScore, leadNotes, ...followUp }) => ({
      ...followUp,
      lead: {
        id: followUp.leadId,
        name: leadName,
        phone: leadPhone,
        location: leadLocation,
        unitType: leadUnitType,
        urgency: leadUrgency,
        score: leadScore,
        notes: leadNotes,
      },
    }));
  }

  async approve(id: string, approvedBy?: string) {
    const [updated] = await db.update(followUps)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: approvedBy || 'Agent',
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, id))
      .returning();
    return updated || null;
  }

  async reject(id: string, reason?: string) {
    const [updated] = await db.update(followUps)
      .set({
        status: 'rejected',
        rejectionReason: reason || 'Rejected by user',
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, id))
      .returning();
    return updated || null;
  }

  async editMessage(id: string, newDraft: string) {
    const [updated] = await db.update(followUps)
      .set({
        messageDraft: newDraft,
        updatedAt: new Date(),
      })
      .where(eq(followUps.id, id))
      .returning();
    return updated || null;
  }

  async deleteFollowUp(id: string) {
    const [deleted] = await db.delete(followUps).where(eq(followUps.id, id)).returning();
    return deleted || null;
  }
}

export const followUpSchedulerService = new FollowUpSchedulerService();
