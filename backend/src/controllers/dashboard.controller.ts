import { Request, Response } from 'express';
import { dashboardStatsService } from '../services/dashboardStats.service';

export class DashboardController {
  async getStats(_req: Request, res: Response) {
    try {
      const data = await dashboardStatsService.getStats();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error('Dashboard stats error:', error?.message || error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to load dashboard statistics',
      });
    }
  }
}

export const dashboardController = new DashboardController();
