import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';

export const notificationController = {
  async list(req: Request, res: Response) {
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const data = await notificationService.list(Number.isFinite(limit) ? limit : 20);
    res.json({ success: true, data });
  },

  async markRead(req: Request, res: Response) {
    const row = await notificationService.markRead(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, data: row });
  },

  async markAllRead(_req: Request, res: Response) {
    const updated = await notificationService.markAllRead();
    res.json({ success: true, data: { updated } });
  },
};
