import { db, listings, listingPhotos, listingDescriptions, listingVideoPrompts } from '../db';
import { eq, desc, isNull, and, or, ilike } from 'drizzle-orm';
import type {
  Listing,
  ListingPhoto,
  ListingDescription,
  ListingWithDetails,
  CreateListingRequest,
  VideoScriptRecord
} from '../types';

export class ListingModel {
  // Create a new listing
  async create(data: CreateListingRequest): Promise<Listing> {
    const [listing] = await db.insert(listings).values({
      title: data.title,
      landArea: data.landArea?.toString(),
      buildingArea: data.buildingArea?.toString(),
      location: data.location,
      price: data.price.toString(),
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      propertyType: data.propertyType,
      additionalInfo: data.additionalInfo,
      status: 'draft',
      userId: data.userId,
    }).returning();

    return this.mapToListing(listing);
  }

  // Get listing by ID (excluding soft-deleted)
  async findById(id: string): Promise<Listing | null> {
    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)));

    return listing ? this.mapToListing(listing) : null;
  }

  // Get listing with photos and descriptions
  async findByIdWithDetails(id: string): Promise<ListingWithDetails | null> {
    const listing = await this.findById(id);
    if (!listing) return null;

    const photos = await this.getPhotos(id);
    const descriptions = await this.getDescriptions(id);

    return {
      ...listing,
      photos,
      descriptions,
    };
  }

  // Get all listings (excluding soft-deleted)
  async findAll(filters?: { status?: string }): Promise<Listing[]> {
    let query = db.select().from(listings)
      .where(isNull(listings.deletedAt))
      .$dynamic();

    if (filters?.status) {
      query = query.where(and(isNull(listings.deletedAt), eq(listings.status, filters.status)));
    } else {
      query = query.orderBy(desc(listings.createdAt));
    }

    const results = await query;
    return results.map(this.mapToListing);
  }

  // Search listings by title/location (for autocomplete)
  async search(q?: string): Promise<Listing[]> {
    const conditions = [isNull(listings.deletedAt)];

    if (q) {
      conditions.push(or(
        ilike(listings.title, `%${q}%`),
        ilike(listings.location, `%${q}%`)
      )!);
    }

    const results = await db
      .select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(desc(listings.createdAt));

    return results.map(this.mapToListing);
  }

  // Update listing
  async update(id: string, data: Partial<CreateListingRequest>): Promise<Listing | null> {
    const updateData: any = {};
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.landArea !== undefined) updateData.landArea = data.landArea.toString();
    if (data.buildingArea !== undefined) updateData.buildingArea = data.buildingArea.toString();
    if (data.location !== undefined) updateData.location = data.location;
    if (data.price !== undefined) updateData.price = data.price.toString();
    if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms;
    if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms;
    if (data.propertyType !== undefined) updateData.propertyType = data.propertyType;
    if (data.additionalInfo !== undefined) updateData.additionalInfo = data.additionalInfo;

    const [updated] = await db
      .update(listings)
      .set(updateData)
      .where(and(eq(listings.id, id), isNull(listings.deletedAt)))
      .returning();

    return updated ? this.mapToListing(updated) : null;
  }

  // Update listing status
  async updateStatus(id: string, status: string): Promise<Listing | null> {
    const [updated] = await db
      .update(listings)
      .set({ status })
      .where(eq(listings.id, id))
      .returning();

    return updated ? this.mapToListing(updated) : null;
  }

  // Soft delete listing
  async delete(id: string): Promise<boolean> {
    const [result] = await db
      .update(listings)
      .set({ deletedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();

    if (result) {
      await db.delete(listingPhotos).where(eq(listingPhotos.listingId, id));
      await db.delete(listingDescriptions).where(eq(listingDescriptions.listingId, id));
    }

    return !!result;
  }

  // Add photo to listing
  async addPhoto(listingId: string, photoUrl: string, order: number = 0, isFeatured: boolean = false): Promise<ListingPhoto> {
    if (isFeatured) {
      await db
        .update(listingPhotos)
        .set({ isFeatured: false })
        .where(eq(listingPhotos.listingId, listingId));
    }

    const [photo] = await db.insert(listingPhotos).values({
      listingId,
      photoUrl,
      photoOrder: order,
      isFeatured,
    }).returning();

    return this.mapToPhoto(photo);
  }

  // Set featured photo for a listing
  async setFeaturedPhoto(listingId: string, photoId: string): Promise<boolean> {
    await db
      .update(listingPhotos)
      .set({ isFeatured: false })
      .where(eq(listingPhotos.listingId, listingId));

    const [updated] = await db
      .update(listingPhotos)
      .set({ isFeatured: true })
      .where(eq(listingPhotos.id, photoId))
      .returning();

    return !!updated;
  }

  // Get photos for listing
  async getPhotos(listingId: string): Promise<ListingPhoto[]> {
    const photos = await db
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId))
      .orderBy(desc(listingPhotos.isFeatured), listingPhotos.photoOrder);

    return photos.map(this.mapToPhoto);
  }

  // Delete photo
  async deletePhoto(photoId: string): Promise<boolean> {
    const result = await db
      .delete(listingPhotos)
      .where(eq(listingPhotos.id, photoId))
      .returning();

    return result.length > 0;
  }

  // Add description to listing
  async addDescription(
    listingId: string,
    variantType: 'formal' | 'casual_1' | 'casual_2',
    text: string
  ): Promise<ListingDescription> {
    const [description] = await db.insert(listingDescriptions).values({
      listingId,
      variantType,
      descriptionText: text,
      isSelected: false,
    }).returning();

    return this.mapToDescription(description);
  }

  // Clear all descriptions for a listing (before re-generating)
  async clearDescriptions(listingId: string): Promise<void> {
    await db
      .delete(listingDescriptions)
      .where(eq(listingDescriptions.listingId, listingId));
  }

  // Get descriptions for listing
  async getDescriptions(listingId: string): Promise<ListingDescription[]> {
    const descriptions = await db
      .select()
      .from(listingDescriptions)
      .where(eq(listingDescriptions.listingId, listingId));

    return descriptions.map(this.mapToDescription);
  }

  // Select a description variant
  async selectDescription(descriptionId: string): Promise<boolean> {
    // First, get the description to find its listing
    const [description] = await db
      .select()
      .from(listingDescriptions)
      .where(eq(listingDescriptions.id, descriptionId));

    if (!description) return false;

    // Unselect all descriptions for this listing
    await db
      .update(listingDescriptions)
      .set({ isSelected: false })
      .where(eq(listingDescriptions.listingId, description.listingId));

    // Select the chosen description
    await db
      .update(listingDescriptions)
      .set({ isSelected: true })
      .where(eq(listingDescriptions.id, descriptionId));

    return true;
  }

  // ============================================================
  // VIDEO SCRIPT CRUD
  // ============================================================

  // Save a generated video script
  async saveVideoScript(data: {
    listingId: string;
    name: string;
    style: string;
    model: string;
    aspectRatio: string;
    customInstructions?: string;
    includeVoiceOver: boolean;
    voiceGender?: string;
    voiceAge?: string;
    voiceLanguage?: string;
    script: string;
    voiceOverScript: string | null;
    scriptJson: any;
  }): Promise<VideoScriptRecord> {
    const [row] = await db.insert(listingVideoPrompts).values({
      listingId: data.listingId,
      name: data.name,
      style: data.style,
      model: data.model,
      aspectRatio: data.aspectRatio,
      customInstructions: data.customInstructions || null,
      includeVoiceOver: data.includeVoiceOver,
      voiceGender: data.voiceGender || null,
      voiceAge: data.voiceAge || null,
      voiceLanguage: data.voiceLanguage || null,
      script: data.script,
      voiceOverScript: data.voiceOverScript || null,
      scriptJson: data.scriptJson,
    }).returning();

    return this.mapToVideoScriptRecord(row);
  }

  // Update an existing video script
  async updateVideoScript(id: string, data: Partial<{
    name: string;
    script: string;
    voiceOverScript: string | null;
    scriptJson: any;
    style: string;
    model: string;
    aspectRatio: string;
    customInstructions: string;
    includeVoiceOver: boolean;
    voiceGender: string;
    voiceAge: string;
    voiceLanguage: string;
  }>): Promise<VideoScriptRecord | null> {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.script !== undefined) updateData.script = data.script;
    if (data.voiceOverScript !== undefined) updateData.voiceOverScript = data.voiceOverScript;
    if (data.scriptJson !== undefined) updateData.scriptJson = data.scriptJson;
    if (data.style !== undefined) updateData.style = data.style;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.aspectRatio !== undefined) updateData.aspectRatio = data.aspectRatio;
    if (data.customInstructions !== undefined) updateData.customInstructions = data.customInstructions;
    if (data.includeVoiceOver !== undefined) updateData.includeVoiceOver = data.includeVoiceOver;
    if (data.voiceGender !== undefined) updateData.voiceGender = data.voiceGender;
    if (data.voiceAge !== undefined) updateData.voiceAge = data.voiceAge;
    if (data.voiceLanguage !== undefined) updateData.voiceLanguage = data.voiceLanguage;

    if (Object.keys(updateData).length === 0) {
      const [row] = await db.select().from(listingVideoPrompts).where(eq(listingVideoPrompts.id, id));
      return row ? this.mapToVideoScriptRecord(row) : null;
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(listingVideoPrompts)
      .set(updateData)
      .where(eq(listingVideoPrompts.id, id))
      .returning();

    return updated ? this.mapToVideoScriptRecord(updated) : null;
  }

  // List all video scripts for a listing
  async listVideoScripts(listingId: string): Promise<VideoScriptRecord[]> {
    const rows = await db
      .select()
      .from(listingVideoPrompts)
      .where(eq(listingVideoPrompts.listingId, listingId))
      .orderBy(desc(listingVideoPrompts.createdAt));

    return rows.map(this.mapToVideoScriptRecord);
  }

  // Get a single video script by id
  async getVideoScript(id: string): Promise<VideoScriptRecord | null> {
    const [row] = await db
      .select()
      .from(listingVideoPrompts)
      .where(eq(listingVideoPrompts.id, id));

    return row ? this.mapToVideoScriptRecord(row) : null;
  }

  // Delete a video script
  async deleteVideoScript(id: string): Promise<boolean> {
    const result = await db
      .delete(listingVideoPrompts)
      .where(eq(listingVideoPrompts.id, id))
      .returning();

    return result.length > 0;
  }

  private mapToVideoScriptRecord(data: any): VideoScriptRecord {
    return {
      id: data.id,
      listing_id: data.listingId,
      name: data.name,
      style: data.style,
      model: data.model,
      aspect_ratio: data.aspectRatio,
      custom_instructions: data.customInstructions || null,
      include_voice_over: data.includeVoiceOver,
      voice_gender: data.voiceGender || null,
      voice_age: data.voiceAge || null,
      voice_language: data.voiceLanguage || null,
      script: data.script,
      voice_over_script: data.voiceOverScript || null,
      script_json: data.scriptJson,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    };
  }

  // Helper: Map database result to Listing type
  private mapToListing(data: any): Listing {
    return {
      id: data.id,
      title: data.title,
      land_area: data.landArea ? parseFloat(data.landArea) : undefined,
      building_area: data.buildingArea ? parseFloat(data.buildingArea) : undefined,
      location: data.location,
      price: parseFloat(data.price),
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      property_type: data.propertyType,
      region: data.region ?? undefined,
      source_url: data.sourceUrl ?? undefined,
      additional_info: data.additionalInfo,
      status: data.status,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    };
  }

  // Helper: Map database result to ListingPhoto type
  private mapToPhoto(data: any): ListingPhoto {
    return {
      id: data.id,
      listing_id: data.listingId,
      photo_url: data.photoUrl,
      photo_order: data.photoOrder,
      is_featured: data.isFeatured ?? data.is_featured ?? false,
      uploaded_at: data.uploadedAt,
    };
  }

  // Helper: Map database result to ListingDescription type
  private mapToDescription(data: any): ListingDescription {
    return {
      id: data.id,
      listing_id: data.listingId,
      variant_type: data.variantType,
      description_text: data.descriptionText,
      generated_at: data.generatedAt,
      is_selected: data.isSelected,
      created_at: data.createdAt,
    };
  }
}

export default new ListingModel();
