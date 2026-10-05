import { desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { notifications } from '../db/schema';

export type NotificationType = 'storyboard_images' | 'scrape_complete' | 'scrape_failed';

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  userId?: string | null;
}

export interface NotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

function serialize(row: typeof notifications.$inferSelect): NotificationRecord {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const notificationService = {
  async create(input: CreateNotificationInput): Promise<NotificationRecord> {
    const [row] = await db
      .insert(notifications)
      .values({
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        metadata: input.metadata ?? null,
        userId: input.userId ?? null,
      })
      .returning();
    return serialize(row);
  },

  async list(limit = 20): Promise<{ items: NotificationRecord[]; unreadCount: number }> {
    const capped = Math.min(Math.max(limit, 1), 50);
    const [items, unreadRows] = await Promise.all([
      db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(capped),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(notifications)
        .where(isNull(notifications.readAt)),
    ]);
    return {
      items: items.map(serialize),
      unreadCount: unreadRows[0]?.value ?? 0,
    };
  },

  async markRead(id: string): Promise<NotificationRecord | null> {
    const [row] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return row ? serialize(row) : null;
  },

  async markAllRead(): Promise<number> {
    const rows = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(isNull(notifications.readAt))
      .returning({ id: notifications.id });
    return rows.length;
  },
};

export function countGeneratedStoryboardImages(result: {
  sheets?: Array<{ scenes?: Array<{ generated_image_url?: string | null }> }>;
}): number {
  if (!result.sheets) return 0;
  return result.sheets.reduce((total, sheet) => {
    const scenes = sheet.scenes || [];
    return total + scenes.filter((scene) => Boolean(scene.generated_image_url)).length;
  }, 0);
}
