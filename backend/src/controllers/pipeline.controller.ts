import { Request, Response } from 'express';
import { PipelineNotConfiguredError } from '../db/pipeline';
import { pipelineService } from '../services/pipeline.service';

function toInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function toStr(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return value.trim();
}

function handleError(res: Response, error: any, fallback: string) {
  if (error instanceof PipelineNotConfiguredError) {
    return res.status(503).json({ success: false, error: error.message });
  }
  console.error(`Pipeline error (${fallback}):`, error?.message || error);
  return res.status(500).json({ success: false, error: error?.message || fallback });
}

export class PipelineController {
  async getOverview(_req: Request, res: Response) {
    try {
      const data = await pipelineService.getOverview();
      res.json({ success: true, data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load pipeline overview');
    }
  }

  async getSources(_req: Request, res: Response) {
    try {
      const data = await pipelineService.listSources();
      res.json({ success: true, data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load sources');
    }
  }

  async getListings(req: Request, res: Response) {
    try {
      const data = await pipelineService.listScrapedListings({
        sourceId: toInt(req.query.sourceId),
        search: toStr(req.query.search),
        marketStatus: toStr(req.query.marketStatus),
        isActive: toBool(req.query.isActive),
        limit: toInt(req.query.limit),
        offset: toInt(req.query.offset),
      });
      res.json({ success: true, ...data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load scraped listings');
    }
  }

  async getListing(req: Request, res: Response) {
    try {
      const data = await pipelineService.getScrapedListing(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Scraped listing not found' });
      }
      res.json({ success: true, data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load scraped listing');
    }
  }

  async getAnalyses(req: Request, res: Response) {
    try {
      const data = await pipelineService.listAnalyses({
        listingId: toStr(req.query.listingId),
        search: toStr(req.query.search),
        limit: toInt(req.query.limit),
        offset: toInt(req.query.offset),
      });
      res.json({ success: true, ...data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load listing analyses');
    }
  }

  async getPromoContent(req: Request, res: Response) {
    try {
      const data = await pipelineService.listPromoContent({
        listingId: toStr(req.query.listingId),
        limit: toInt(req.query.limit),
        offset: toInt(req.query.offset),
      });
      res.json({ success: true, ...data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load promo content');
    }
  }

  async getContentCalendar(req: Request, res: Response) {
    try {
      const data = await pipelineService.listContentCalendar({
        listingId: toStr(req.query.listingId),
        platform: toStr(req.query.platform),
        approvalStatus: toStr(req.query.approvalStatus),
        from: toStr(req.query.from),
        to: toStr(req.query.to),
        limit: toInt(req.query.limit),
        offset: toInt(req.query.offset),
      });
      res.json({ success: true, ...data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load content calendar');
    }
  }

  async getContentCalendarItem(req: Request, res: Response) {
    try {
      const data = await pipelineService.getContentCalendarItem(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, error: 'Content calendar item not found' });
      }
      res.json({ success: true, data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load content calendar item');
    }
  }

  async getFacets(_req: Request, res: Response) {
    try {
      const data = await pipelineService.getFacets();
      res.json({ success: true, data });
    } catch (error: any) {
      handleError(res, error, 'Failed to load pipeline facets');
    }
  }

  async schedulePromo(req: Request, res: Response) {
    try {
      const { promoId } = req.params;
      const startDate = toStr(req.body?.startDate);
      const result = await pipelineService.schedulePromoToCalendar(promoId, startDate);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (error?.message === 'Promo content not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      handleError(res, error, 'Failed to schedule promo content');
    }
  }

  async generateCalendar(req: Request, res: Response) {
    try {
      const { listingId } = req.params;
      const contentTypes = Array.isArray(req.body?.contentTypes) ? req.body.contentTypes : undefined;
      const startDate = toStr(req.body?.startDate);
      const result = await pipelineService.generateCalendarForListing(listingId, contentTypes, startDate);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      if (error?.message === 'Listing not found') {
        return res.status(404).json({ success: false, error: error.message });
      }
      handleError(res, error, 'Failed to generate calendar');
    }
  }
}

export const pipelineController = new PipelineController();
