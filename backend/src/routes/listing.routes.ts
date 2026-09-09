import { Router } from 'express';
import listingController from '../controllers/listing.controller';
import upload from '../middleware/upload';

const router = Router();

/**
 * @route   POST /api/listings
 * @desc    Create a new listing with optional photo uploads
 * @access  Public (should be protected in production)
 */
router.post('/', upload.array('photos', 10), listingController.createListing);

/**
 * @route   GET /api/listings
 * @desc    Get all listings with optional status filter
 * @query   status - Filter by status (draft, published, sold)
 * @access  Public
 */
router.get('/', listingController.getListings);

/**
 * @route   GET /api/listings/:id
 * @desc    Get listing by ID with full details (photos, descriptions)
 * @access  Public
 */
router.get('/:id', listingController.getListingById);

/**
 * @route   PATCH /api/listings/:id
 * @desc    Update listing details with optional photo uploads
 * @access  Public (should be protected in production)
 */
router.patch('/:id', upload.array('photos', 10), listingController.updateListing);

/**
 * @route   DELETE /api/listings/:id
 * @desc    Delete a listing
 * @access  Public (should be protected in production)
 */
router.delete('/:id', listingController.deleteListing);

/**
 * @route   POST /api/listings/:id/generate-video-script
 * @desc    Generate AI video script for a listing using property images
 * @access  Public
 */
router.post('/:id/generate-video-script', listingController.generateVideoScript);

/**
 * @route   POST /api/listings/:id/video-scripts
 * @desc    Save a generated video script
 * @access  Public
 */
router.post('/:id/video-scripts', listingController.saveVideoScript);

/**
 * @route   GET /api/listings/:id/video-scripts
 * @desc    List all saved video scripts for a listing
 * @access  Public
 */
router.get('/:id/video-scripts', listingController.getVideoScripts);

/**
 * @route   PUT /api/listings/video-scripts/:scriptId
 * @desc    Update a video script
 * @access  Public
 */
router.put('/video-scripts/:scriptId', listingController.updateVideoScript);

/**
 * @route   DELETE /api/listings/video-scripts/:scriptId
 * @desc    Delete a saved video script
 * @access  Public
 */
router.delete('/video-scripts/:scriptId', listingController.deleteVideoScript);

/**
 * @route   POST /api/listings/:id/generate-descriptions
 * @desc    Generate formal & casual AI description variants
 * @access  Public
 */
router.post('/:id/generate-descriptions', listingController.generateDescriptions);

/**
 * @route   PATCH /api/listings/:listingId/descriptions/:descId/select
 * @desc    Select a description variant as the primary one
 * @access  Public (should be protected in production)
 */
router.patch('/:listingId/descriptions/:descId/select', listingController.selectDescription);

/**
 * @route   DELETE /api/listings/photos/:photoId
 * @desc    Delete a photo from a listing
 * @access  Public (should be protected in production)
 */
router.delete('/photos/:photoId', listingController.deletePhoto);

/**
 * @route   PATCH /api/listings/:listingId/photos/:photoId/featured
 * @desc    Set a photo as the featured photo for a listing
 * @access  Public (should be protected in production)
 */
router.patch('/:listingId/photos/:photoId/featured', listingController.setFeaturedPhoto);

/**
 * @route   POST /api/listings/:id/generate-analysis
 * @desc    Analyze listing to determine buyer personas, target market, and marketing channels
 * @access  Public
 */
router.post('/:id/generate-analysis', listingController.analyzeListing);

export default router;
