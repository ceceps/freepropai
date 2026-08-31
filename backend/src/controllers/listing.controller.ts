import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { generateThumbnail } from '../utils/image';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { validatePhotoUploads } from '../middleware/upload';
import ListingModel from '../models/Listing';
import descriptionGenerator from '../services/descriptionGenerator.service';
import llmClient from '../utils/llmClient';
import type { CreateListingRequest, ApiResponse, PaginatedResponse } from '../types';

class ListingController {
  /**
   * Create a new listing
   * POST /api/listings
   */
  createListing = asyncHandler(async (req: Request, res: Response) => {
    // Validate upload size on server side (max 5MB total)
    validatePhotoUploads(req);

    const data: CreateListingRequest = req.body;

    // Validate required fields
    if (!data.title || !data.location || !data.price) {
      throw new AppError('Title, location, and price are required', 400);
    }

    // Convert and validate price (form data sends as string)
    const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
    if (isNaN(price)) {
      throw new AppError('Price must be a valid number', 400);
    }
    data.price = price;

    // Convert numeric fields from strings if needed (form data)
    if (data.landArea && typeof data.landArea === 'string') {
      data.landArea = parseFloat(data.landArea);
    }
    if (data.buildingArea && typeof data.buildingArea === 'string') {
      data.buildingArea = parseFloat(data.buildingArea);
    }
    if (data.bedrooms && typeof data.bedrooms === 'string') {
      data.bedrooms = parseInt(data.bedrooms);
    }
    if (data.bathrooms && typeof data.bathrooms === 'string') {
      data.bathrooms = parseInt(data.bathrooms);
    }

    const files = req.files && Array.isArray(req.files) ? req.files : [];
    if (files.length > 10) {
      throw new AppError('Jumlah total foto melebihi batas maksimal 10 foto', 400);
    }

    // Create listing
    const listing = await ListingModel.create({
      ...data,
      userId: req.user?.id,
    } as CreateListingRequest & { userId?: string });

    // Handle photo uploads if present
    const featuredIndex = data.featuredPhotoIndex !== undefined ? parseInt(data.featuredPhotoIndex as any) : 0;
    const photos = [];
    if (files.length > 0) {
      const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || './uploads');
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const photoUrl = `/uploads/${file.filename}`;
        const isFeatured = i === featuredIndex;

        // Generate thumbnail for the first/featured photo
        if (i === featuredIndex) {
          const originalPath = path.join(uploadDir, file.filename);
          await generateThumbnail(originalPath, uploadDir);
        }

        const photo = await ListingModel.addPhoto(listing.id, photoUrl, i, isFeatured);
        photos.push(photo);
      }
    }

    const response: ApiResponse = {
      success: true,
      data: {
        listingId: listing.id,
        ...listing,
        photos,
      },
    };

    res.status(201).json(response);
  });

  /**
   * Get all listings
   * GET /api/listings?status=draft
   */
  getListings = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query;

    const filters = status ? { status: status as string } : undefined;
    const listings = await ListingModel.findAll(filters);

    // Get photo count for each listing
    const listingsWithMeta = await Promise.all(
      listings.map(async (listing) => {
        const photos = await ListingModel.getPhotos(listing.id);
        const descriptions = await ListingModel.getDescriptions(listing.id);

        // Thumbnail for the featured photo — generated on first read if missing
        let thumbnailUrl: string | null = null;
        if (photos.length > 0) {
          const featuredPhoto = photos.find(p => p.is_featured) || photos[0];
          const originalFilename = path.basename(featuredPhoto.photo_url);
          const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || './uploads');
          const originalPath = path.join(uploadDir, originalFilename);

          if (fs.existsSync(originalPath)) {
            const { thumbnailUrl: url } = await generateThumbnail(originalPath, uploadDir);
            thumbnailUrl = url;
          } else {
            thumbnailUrl = featuredPhoto.photo_url;
          }
        }

        return {
          id: listing.id,
          title: listing.title,
          location: listing.location,
          price: listing.price,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          status: listing.status,
          photoCount: photos.length,
          hasDescriptions: descriptions.length > 0,
          created_at: listing.created_at,
          thumbnailUrl,
        };
      })
    );

    const response: PaginatedResponse<typeof listingsWithMeta[0]> = {
      success: true,
      data: listingsWithMeta,
    };

    res.json(response);
  });

  /**
   * Get listing by ID with full details
   * GET /api/listings/:id
   */
  getListingById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const listing = await ListingModel.findByIdWithDetails(id);

    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: listing,
    };

    res.json(response);
  });

  /**
   * Update listing
   * PATCH /api/listings/:id
   */
  updateListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate upload size on server side (max 5MB total)
    validatePhotoUploads(req);

    const existingListing = await ListingModel.findByIdWithDetails(id);
    if (!existingListing) {
      throw new AppError('Listing not found', 404);
    }

    const data: Partial<CreateListingRequest> = req.body;

    if (data.price !== undefined) {
      const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
      if (isNaN(price)) {
        throw new AppError('Price must be a valid number', 400);
      }
      data.price = price;
    }
    if (data.landArea && typeof data.landArea === 'string') data.landArea = parseFloat(data.landArea);
    if (data.buildingArea && typeof data.buildingArea === 'string') data.buildingArea = parseFloat(data.buildingArea);
    if (data.bedrooms && typeof data.bedrooms === 'string') data.bedrooms = parseInt(data.bedrooms);
    if (data.bathrooms && typeof data.bathrooms === 'string') data.bathrooms = parseInt(data.bathrooms);

    const newFiles = req.files && Array.isArray(req.files) ? req.files : [];
    if (existingListing.photos.length + newFiles.length > 10) {
      throw new AppError('Jumlah total foto melebihi batas maksimal 10 foto', 400);
    }

    // Update listing text fields
    await ListingModel.update(id, data);

    // Save new photo uploads
    if (newFiles.length > 0) {
      const featuredIndex = data.featuredPhotoIndex !== undefined ? parseInt(data.featuredPhotoIndex as any) : -1;
      const uploadDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || './uploads');
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const photoUrl = `/uploads/${file.filename}`;
        const order = existingListing.photos.length + i;
        const isFeatured = (featuredIndex === i);

        // Generate thumbnail for the featured photo
        if (isFeatured) {
          const originalPath = path.join(uploadDir, file.filename);
          await generateThumbnail(originalPath, uploadDir);
        }

        await ListingModel.addPhoto(id, photoUrl, order, isFeatured);
      }
    }

    // Set featured photo ID if specified for an existing photo
    if (data.featuredPhotoId) {
      await ListingModel.setFeaturedPhoto(id, data.featuredPhotoId);
    }

    const updatedListing = await ListingModel.findByIdWithDetails(id);

    const response: ApiResponse = {
      success: true,
      data: updatedListing,
    };

    res.json(response);
  });

  /**
   * Delete listing
   * DELETE /api/listings/:id
   */
  deleteListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const deleted = await ListingModel.delete(id);

    if (!deleted) {
      throw new AppError('Listing not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Listing deleted successfully',
    };

    res.json(response);
  });

  /**
   * Generate descriptions for a listing
   * POST /api/listings/:id/generate-descriptions
   */
  generateDescriptions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get listing
    const listing = await ListingModel.findById(id);
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    // Generate descriptions using LLM
    const descriptions = await descriptionGenerator.generateDescriptions(listing);

    // Save descriptions to database
    const savedDescriptions = await Promise.all([
      ListingModel.addDescription(id, 'formal', descriptions.formal),
      ListingModel.addDescription(id, 'casual_1', descriptions.casual_1),
      ListingModel.addDescription(id, 'casual_2', descriptions.casual_2),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        listingId: id,
        descriptions: savedDescriptions,
      },
    };

    res.status(201).json(response);
  });

  /**
   * Generate AI video script for a listing using property images
   * POST /api/listings/:id/generate-video-script
   */
  generateVideoScript = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const listing = await ListingModel.findByIdWithDetails(id);
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    if (!listing.photos || listing.photos.length === 0) {
      throw new AppError('Property must have at least one photo to generate a video script prompt', 400);
    }

    const { customInstructions } = req.body || {};

    const systemPrompt = `You are an expert AI video prompt engineer for real estate.
Generate a detailed, cinematic video generation prompt optimized for tools like Runway, Pika, or Google Vids.
Focus on:
1. Cinematic style, high-end real estate videography, natural light, 4K, smooth gimbal camera movements.
2. Descriptive sequence: "Slow motion pan through [Room Name], soft sunlight, architectural photography style."
3. Atmosphere: Luxury, inviting, modern.

Output only the prompt block.`;

    const userPrompt = `Property Details:
Title: ${listing.title}
Price: Rp ${listing.price}
Location: ${listing.location}
Land/Building: ${listing.land_area || '-'} m² / ${listing.building_area || '-'} m²
Bedrooms/Bathrooms: ${listing.bedrooms || '-'} / ${listing.bathrooms || '-'}
Property Type: ${listing.property_type || 'Rumah'}
Key Features: ${listing.additional_info || 'None'}
Total Photos Available: ${listing.photos.length}

${customInstructions ? `Additional User Instructions: ${customInstructions}` : ''}

Generate the video generation prompt in English for optimal AI video model performance.`;

    let scriptText = '';
    try {
      scriptText = await llmClient.generateCompletion(systemPrompt, userPrompt);
      if (!scriptText || scriptText.trim().length === 0) {
        throw new Error('LLM returned an empty script');
      }
    } catch (error) {
      console.warn('⚠️ LLM video script generation failed, using template-based fallback:', error);
      const priceFormatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(listing.price);
      scriptText = `Cinematic real estate video showcase of "${listing.title}" located in ${listing.location}. 

[Scene 1: Establishing Shot]
Drone footage slowly descending towards the front exterior of the ${listing.property_type || 'Rumah'}, showing the architectural layout under soft warm golden hour sunlight. Smooth tilt down.

[Scene 2: Entrance & Living Area]
Slow motion steadycam entry through the main door. Smooth pan showcasing the spacious living room, highlighting the clean design, high ceilings, and natural light pouring in from the windows.

[Scene 3: Bedrooms & Details]
Gimbal glide shot into the main bedroom (${listing.bedrooms || 2} bedrooms total). Focus on the interior spacing and modern finishes. 

[Scene 4: Bathrooms & Amenities]
Slow slider shot showcasing the bathroom (${listing.bathrooms || 1} bathrooms total), highlighting clean fixtures and premium tile work.

[Scene 5: Outro & Call to Action]
Elegant transition to the backyard/garden area or a high-angle view of the property. Text overlay: "For Sale - ${priceFormatted}". Smooth fade out.

Style: 4K resolution, architectural photography style, 24fps cinematic look, warm color grade, DJI gimbal movements, soft natural lighting.
${customInstructions ? `\nUser Notes: ${customInstructions}` : ''}`;
    }

    res.json({
      success: true,
      data: {
        listingId: id,
        script: scriptText
      }
    });
  });

  /**
   * Select a description variant
   * PATCH /api/listings/:listingId/descriptions/:descId/select
   */
  selectDescription = asyncHandler(async (req: Request, res: Response) => {
    const { descId } = req.params;

    const success = await ListingModel.selectDescription(descId);

    if (!success) {
      throw new AppError('Description not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        descriptionId: descId,
        isSelected: true,
      },
    };

    res.json(response);
  });

  /**
   * Delete a photo
   * DELETE /api/listings/photos/:photoId
   */
  deletePhoto = asyncHandler(async (req: Request, res: Response) => {
    const { photoId } = req.params;

    const deleted = await ListingModel.deletePhoto(photoId);

    if (!deleted) {
      throw new AppError('Photo not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Photo deleted successfully',
    };

    res.json(response);
  });

  /**
   * Set photo as featured
   * PATCH /api/listings/:listingId/photos/:photoId/featured
   */
  setFeaturedPhoto = asyncHandler(async (req: Request, res: Response) => {
    const { listingId, photoId } = req.params;

    const success = await ListingModel.setFeaturedPhoto(listingId, photoId);

    if (!success) {
      throw new AppError('Photo not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Foto utama berhasil diperbarui',
    };

    res.json(response);
  });
}

export default new ListingController();
