import { Request, Response, NextFunction } from 'express';
import { followUpSchedulerService } from '../services/followUpScheduler.service';

export class FollowUpController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const { leadId, contextMessage, scheduledForDays } = req.body;
      if (!leadId) {
        return res.status(400).json({ success: false, error: 'leadId is required' });
      }

      const followUp = await followUpSchedulerService.generateAndSchedule({
        leadId,
        contextMessage,
        scheduledForDays: scheduledForDays ? Number(scheduledForDays) : undefined,
      });

      return res.status(201).json({ success: true, data: followUp });
    } catch (error) {
      next(error);
    }
  }

  async getQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const queue = await followUpSchedulerService.getQueue();
      return res.json({ success: true, data: queue });
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;
      const followUp = await followUpSchedulerService.approve(id, approvedBy);
      if (!followUp) {
        return res.status(404).json({ success: false, error: 'Follow-up not found' });
      }
      return res.json({ success: true, data: followUp });
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const followUp = await followUpSchedulerService.reject(id, reason);
      if (!followUp) {
        return res.status(404).json({ success: false, error: 'Follow-up not found' });
      }
      return res.json({ success: true, data: followUp });
    } catch (error) {
      next(error);
    }
  }

  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { messageDraft } = req.body;
      if (!messageDraft) {
        return res.status(400).json({ success: false, error: 'messageDraft is required' });
      }

      const followUp = await followUpSchedulerService.editMessage(id, messageDraft);
      if (!followUp) {
        return res.status(404).json({ success: false, error: 'Follow-up not found' });
      }
      return res.json({ success: true, data: followUp });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await followUpSchedulerService.deleteFollowUp(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Follow-up not found' });
      }
      return res.json({ success: true, message: 'Follow-up deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const followUpController = new FollowUpController();
