import { and, asc, count, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm';
import {
  agents,
  analisaListing,
  contentCalendar,
  getPipelineDb,
  pipelineListings,
  promoContent,
  sources,
} from '../db/pipeline';

export interface Pagination {
  limit?: number;
  offset?: number;
}

export interface ScrapedListingFilters extends Pagination {
  sourceId?: number;
  search?: string;
  marketStatus?: string;
  isActive?: boolean;
}

export interface AnalysisFilters extends Pagination {
  listingId?: string;
  search?: string;
}

export interface PromoFilters extends Pagination {
  listingId?: string;
}

export interface CalendarFilters extends Pagination {
  listingId?: string;
  platform?: string;
  approvalStatus?: string;
  from?: string;
  to?: string;
}

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

function clampOffset(offset?: number): number {
  if (!offset || Number.isNaN(offset) || offset < 0) return 0;
  return Math.trunc(offset);
}

const listingSelection = {
  id: pipelineListings.id,
  title: pipelineListings.title,
  propertyType: pipelineListings.propertyType,
  price: pipelineListings.price,
  pricePerM2: pipelineListings.pricePerM2,
  lb: pipelineListings.lb,
  lt: pipelineListings.lt,
  bedrooms: pipelineListings.bedrooms,
  bathrooms: pipelineListings.bathrooms,
  garage: pipelineListings.garage,
  floors: pipelineListings.floors,
  certificate: pipelineListings.certificate,
  address: pipelineListings.address,
  description: pipelineListings.description,
  features: pipelineListings.features,
  photos: pipelineListings.photos,
  photoLabels: pipelineListings.photoLabels,
  featureImage: pipelineListings.featureImage,
  videoUrl: pipelineListings.videoUrl,
  agentName: pipelineListings.agentName,
  agentPhone: pipelineListings.agentPhone,
  agency: pipelineListings.agency,
  status: pipelineListings.status,
  isActive: pipelineListings.isActive,
  marketStatus: pipelineListings.marketStatus,
  sourceId: pipelineListings.sourceId,
  sourceUrl: pipelineListings.sourceUrl,
  scrapedAt: pipelineListings.scrapedAt,
  createdAt: pipelineListings.createdAt,
  sourceName: sources.name,
  sourceCode: sources.code,
};

export class PipelineService {
  async getOverview() {
    const db = getPipelineDb();
    const [sourceRows, listingRows, activeRows, analysisRows, promoRows, calendarRows, pendingRows] =
      await Promise.all([
        db.select({ value: count() }).from(sources),
        db.select({ value: count() }).from(pipelineListings),
        db.select({ value: count() }).from(pipelineListings).where(eq(pipelineListings.isActive, true)),
        db.select({ value: count() }).from(analisaListing),
        db.select({ value: count() }).from(promoContent),
        db.select({ value: count() }).from(contentCalendar),
        db.select({ value: count() }).from(contentCalendar).where(eq(contentCalendar.approvalStatus, 'pending')),
      ]);

    return {
      sources: Number(sourceRows[0]?.value ?? 0),
      listings: Number(listingRows[0]?.value ?? 0),
      activeListings: Number(activeRows[0]?.value ?? 0),
      analyses: Number(analysisRows[0]?.value ?? 0),
      promoContent: Number(promoRows[0]?.value ?? 0),
      calendarItems: Number(calendarRows[0]?.value ?? 0),
      pendingCalendar: Number(pendingRows[0]?.value ?? 0),
    };
  }

  async listSources() {
    const db = getPipelineDb();
    return db
      .select({
        id: sources.id,
        code: sources.code,
        name: sources.name,
        baseUrl: sources.baseUrl,
        isActive: sources.isActive,
        lastStatus: sources.lastStatus,
        lastError: sources.lastError,
        lastScrapedAt: sources.lastScrapedAt,
        lastScrapedPage: sources.lastScrapedPage,
        lastScrapeMode: sources.lastScrapeMode,
        listingCount: sql<number>`count(${pipelineListings.id})::int`,
      })
      .from(sources)
      .leftJoin(pipelineListings, eq(pipelineListings.sourceId, sources.id))
      .groupBy(sources.id)
      .orderBy(asc(sources.name));
  }

  async listScrapedListings(filters: ScrapedListingFilters) {
    const db = getPipelineDb();
    const conditions: SQL[] = [];
    if (filters.sourceId) conditions.push(eq(pipelineListings.sourceId, filters.sourceId));
    if (filters.marketStatus) conditions.push(eq(pipelineListings.marketStatus, filters.marketStatus));
    if (typeof filters.isActive === 'boolean') conditions.push(eq(pipelineListings.isActive, filters.isActive));
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(ilike(pipelineListings.title, pattern), ilike(pipelineListings.description, pattern))!
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const limit = clampLimit(filters.limit);
    const offset = clampOffset(filters.offset);

    const [data, totalRows] = await Promise.all([
      db
        .select(listingSelection)
        .from(pipelineListings)
        .leftJoin(sources, eq(pipelineListings.sourceId, sources.id))
        .where(where)
        .orderBy(desc(pipelineListings.scrapedAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(pipelineListings).where(where),
    ]);

    return { data, total: Number(totalRows[0]?.value ?? 0), limit, offset };
  }

  async getScrapedListing(id: string) {
    const db = getPipelineDb();
    const [listing] = await db
      .select(listingSelection)
      .from(pipelineListings)
      .leftJoin(sources, eq(pipelineListings.sourceId, sources.id))
      .where(eq(pipelineListings.id, id))
      .limit(1);

    if (!listing) return null;

    const [analysisRows, promoRows, calendarRows] = await Promise.all([
      db.select().from(analisaListing).where(eq(analisaListing.listingId, id)).limit(1),
      db
        .select()
        .from(promoContent)
        .where(eq(promoContent.listingId, id))
        .orderBy(asc(promoContent.dayNum), asc(promoContent.seqNum)),
      db
        .select()
        .from(contentCalendar)
        .where(eq(contentCalendar.listingId, id))
        .orderBy(desc(contentCalendar.date)),
    ]);

    return {
      ...listing,
      analysis: analysisRows[0] ?? null,
      promoContent: promoRows,
      calendar: calendarRows,
    };
  }

  async listAnalyses(filters: AnalysisFilters) {
    const db = getPipelineDb();
    const conditions: SQL[] = [];
    if (filters.listingId) conditions.push(eq(analisaListing.listingId, filters.listingId));
    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(analisaListing.buyerPersona, pattern),
          ilike(analisaListing.sellingPoints, pattern),
          ilike(analisaListing.fullAnalysisMarkdown, pattern),
          ilike(pipelineListings.title, pattern)
        )!
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const limit = clampLimit(filters.limit);
    const offset = clampOffset(filters.offset);

    const [data, totalRows] = await Promise.all([
      db
        .select({
          id: analisaListing.id,
          listingId: analisaListing.listingId,
          buyerPersona: analisaListing.buyerPersona,
          sellingPoints: analisaListing.sellingPoints,
          fullAnalysisMarkdown: analisaListing.fullAnalysisMarkdown,
          createdAt: analisaListing.createdAt,
          updatedAt: analisaListing.updatedAt,
          listingTitle: pipelineListings.title,
          listingPrice: pipelineListings.price,
          listingPropertyType: pipelineListings.propertyType,
          listingFeatureImage: pipelineListings.featureImage,
        })
        .from(analisaListing)
        .leftJoin(pipelineListings, eq(analisaListing.listingId, pipelineListings.id))
        .where(where)
        .orderBy(desc(analisaListing.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(analisaListing)
        .leftJoin(pipelineListings, eq(analisaListing.listingId, pipelineListings.id))
        .where(where),
    ]);

    return { data, total: Number(totalRows[0]?.value ?? 0), limit, offset };
  }

  async listPromoContent(filters: PromoFilters) {
    const db = getPipelineDb();
    const conditions: SQL[] = [];
    if (filters.listingId) conditions.push(eq(promoContent.listingId, filters.listingId));
    const where = conditions.length ? and(...conditions) : undefined;
    const limit = clampLimit(filters.limit);
    const offset = clampOffset(filters.offset);

    const [data, totalRows] = await Promise.all([
      db
        .select({
          id: promoContent.id,
          listingId: promoContent.listingId,
          dayNum: promoContent.dayNum,
          seqNum: promoContent.seqNum,
          angle: promoContent.angle,
          posterSpec: promoContent.posterSpec,
          captionHpsc: promoContent.captionHpsc,
          videoScript: promoContent.videoScript,
          videoMeta: promoContent.videoMeta,
          createdAt: promoContent.createdAt,
          listingTitle: pipelineListings.title,
          listingFeatureImage: pipelineListings.featureImage,
        })
        .from(promoContent)
        .leftJoin(pipelineListings, eq(promoContent.listingId, pipelineListings.id))
        .where(where)
        .orderBy(asc(promoContent.dayNum), asc(promoContent.seqNum))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(promoContent).where(where),
    ]);

    return { data, total: Number(totalRows[0]?.value ?? 0), limit, offset };
  }

  async listContentCalendar(filters: CalendarFilters) {
    const db = getPipelineDb();
    const conditions: SQL[] = [];
    if (filters.listingId) conditions.push(eq(contentCalendar.listingId, filters.listingId));
    if (filters.platform) conditions.push(eq(contentCalendar.platform, filters.platform));
    if (filters.approvalStatus) conditions.push(eq(contentCalendar.approvalStatus, filters.approvalStatus));
    if (filters.from) conditions.push(gte(contentCalendar.date, filters.from));
    if (filters.to) conditions.push(lte(contentCalendar.date, filters.to));
    const where = conditions.length ? and(...conditions) : undefined;
    const limit = clampLimit(filters.limit);
    const offset = clampOffset(filters.offset);

    const [data, totalRows] = await Promise.all([
      db
        .select({
          id: contentCalendar.id,
          listingId: contentCalendar.listingId,
          date: contentCalendar.date,
          platform: contentCalendar.platform,
          contentType: contentCalendar.contentType,
          hook: contentCalendar.hook,
          captionDraft: contentCalendar.captionDraft,
          assetFiles: contentCalendar.assetFiles,
          disclosureTags: contentCalendar.disclosureTags,
          approvalStatus: contentCalendar.approvalStatus,
          approvedBy: contentCalendar.approvedBy,
          postedAt: contentCalendar.postedAt,
          performanceJson: contentCalendar.performanceJson,
          createdAt: contentCalendar.createdAt,
          listingTitle: pipelineListings.title,
          listingFeatureImage: pipelineListings.featureImage,
          approvedByName: agents.fullName,
        })
        .from(contentCalendar)
        .leftJoin(pipelineListings, eq(contentCalendar.listingId, pipelineListings.id))
        .leftJoin(agents, sql`${agents.id}::text = ${contentCalendar.approvedBy}`)
        .where(where)
        .orderBy(desc(contentCalendar.date), asc(contentCalendar.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(contentCalendar).where(where),
    ]);

    return { data, total: Number(totalRows[0]?.value ?? 0), limit, offset };
  }

  async getFacets() {
    const db = getPipelineDb();
    const [platforms, approvalStatuses, marketStatuses, contentTypes] = await Promise.all([
      db.selectDistinct({ value: contentCalendar.platform }).from(contentCalendar).orderBy(asc(contentCalendar.platform)),
      db.selectDistinct({ value: contentCalendar.approvalStatus }).from(contentCalendar).orderBy(asc(contentCalendar.approvalStatus)),
      db.selectDistinct({ value: pipelineListings.marketStatus }).from(pipelineListings).orderBy(asc(pipelineListings.marketStatus)),
      db.selectDistinct({ value: contentCalendar.contentType }).from(contentCalendar).orderBy(asc(contentCalendar.contentType)),
    ]);

    const clean = (rows: { value: string | null }[]) =>
      rows.map((r) => r.value).filter((v): v is string => Boolean(v));

    return {
      platforms: clean(platforms),
      approvalStatuses: clean(approvalStatuses),
      marketStatuses: clean(marketStatuses),
      contentTypes: clean(contentTypes),
    };
  }
}

export const pipelineService = new PipelineService();
