import axios from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Listing,
  ListingWithDetails,
  ListingSummary,
  CreateListingData,
  ListingDescription,
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Listing API
export const listingApi = {
  // Create a new listing with photos
  async create(data: CreateListingData, photos?: File[]): Promise<ApiResponse<Listing>> {
    const formData = new FormData();
    
    // Append listing data
    formData.append('title', data.title);
    formData.append('location', data.location);
    formData.append('price', data.price.toString());
    
    if (data.landArea) formData.append('landArea', data.landArea.toString());
    if (data.buildingArea) formData.append('buildingArea', data.buildingArea.toString());
    if (data.bedrooms) formData.append('bedrooms', data.bedrooms.toString());
    if (data.bathrooms) formData.append('bathrooms', data.bathrooms.toString());
    if (data.propertyType) formData.append('propertyType', data.propertyType);
    if (data.additionalInfo) formData.append('additionalInfo', data.additionalInfo);
    
    // Append photos
    if (photos && photos.length > 0) {
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
    }
    
    const response = await api.post<ApiResponse<Listing>>('/listings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Get all listings
  async getAll(status?: string): Promise<PaginatedResponse<ListingSummary>> {
    const params = status ? { status } : {};
    const response = await api.get<PaginatedResponse<ListingSummary>>('/listings', { params });
    return response.data;
  },

  // Get listing by ID
  async getById(id: string): Promise<ApiResponse<ListingWithDetails>> {
    const response = await api.get<ApiResponse<ListingWithDetails>>(`/listings/${id}`);
    return response.data;
  },

  // Update listing
  async update(id: string, data: Partial<CreateListingData>, photos?: File[]): Promise<ApiResponse<ListingWithDetails>> {
    const formData = new FormData();

    if (data.title !== undefined) formData.append('title', data.title);
    if (data.location !== undefined) formData.append('location', data.location);
    if (data.price !== undefined) formData.append('price', data.price.toString());

    if (data.landArea !== undefined) formData.append('landArea', data.landArea.toString());
    if (data.buildingArea !== undefined) formData.append('buildingArea', data.buildingArea.toString());
    if (data.bedrooms !== undefined) formData.append('bedrooms', data.bedrooms.toString());
    if (data.bathrooms !== undefined) formData.append('bathrooms', data.bathrooms.toString());
    if (data.propertyType !== undefined) formData.append('propertyType', data.propertyType);
    if (data.additionalInfo !== undefined) formData.append('additionalInfo', data.additionalInfo);
    if (data.featuredPhotoId) formData.append('featuredPhotoId', data.featuredPhotoId);
    if (data.featuredPhotoIndex !== undefined) formData.append('featuredPhotoIndex', data.featuredPhotoIndex.toString());

    if (photos && photos.length > 0) {
      photos.forEach((photo) => {
        formData.append('photos', photo);
      });
    }

    const response = await api.patch<ApiResponse<ListingWithDetails>>(`/listings/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Delete listing
  async delete(id: string): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/listings/${id}`);
    return response.data;
  },

  // Generate descriptions
  async generateDescriptions(id: string): Promise<ApiResponse<{ listingId: string; descriptions: ListingDescription[] }>> {
    const response = await api.post<ApiResponse<{ listingId: string; descriptions: ListingDescription[] }>>(
      `/listings/${id}/generate-descriptions`
    );
    return response.data;
  },

  // Select a description variant
  async selectDescription(listingId: string, descriptionId: string): Promise<ApiResponse> {
    const response = await api.patch<ApiResponse>(
      `/listings/${listingId}/descriptions/${descriptionId}/select`
    );
    return response.data;
  },

  // Delete a photo
  async deletePhoto(photoId: string): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/listings/photos/${photoId}`);
    return response.data;
  },

  // Set photo as featured
  async setFeaturedPhoto(listingId: string, photoId: string): Promise<ApiResponse> {
    const response = await api.patch<ApiResponse>(`/listings/${listingId}/photos/${photoId}/featured`);
    return response.data;
  },
};

export default api;
