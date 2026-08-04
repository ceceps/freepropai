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
 * @desc    Update listing details
 * @access  Public (should be protected in production)
 */
router.patch('/:id', listingController.updateListing);

/**
 * @route   DELETE /api/listings/:id
 * @desc    Delete a listing
 * @access  Public (should be protected in production)
 */
router.delete('/:id', listingController.deleteListing);

/**
 * @route   POST /api/listings/:id/generate-descriptions
 * @desc    Generate AI descriptions for a listing
 * @access  Public (should be protected in production)
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

export default router;
