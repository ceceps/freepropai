import { Request, Response, NextFunction } from 'express';
import { leadQualifierService } from '../services/leadQualifier.service';

export class LeadController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, phone } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ success: false, error: 'name and phone are required' });
      }

      const lead = await leadQualifierService.createLead(req.body);
      return res.status(201).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  async qualify(req: Request, res: Response, next: NextFunction) {
    try {
      const { rawChatText, name, phone } = req.body;
      if (!rawChatText) {
        return res.status(400).json({ success: false, error: 'rawChatText is required' });
      }

      const lead = await leadQualifierService.qualifyAndSaveLead({ rawChatText, name, phone });
      return res.status(201).json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const leadsList = await leadQualifierService.getAllLeads();
      return res.json({ success: true, data: leadsList });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const lead = await leadQualifierService.getLeadById(id);
      if (!lead) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
      return res.json({ success: true, data: lead });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await leadQualifierService.updateLead(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
      return res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await leadQualifierService.deleteLead(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Lead not found' });
      }
      return res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const leadController = new LeadController();
