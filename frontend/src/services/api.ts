import axios from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  Listing,
  ListingWithDetails,
  ListingSummary,
  CreateListingData,
  ListingDescription,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ScrapingJob,
  ScrapedListing,
  CreateScrapingJobData,
  ImportScrapedListingData,
  BatchImportResult,
  ScrapingConfig
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authApi = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data;
  },

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data;
  },

  async logout(): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>('/auth/logout');
    return response.data;
  },

  async refresh(): Promise<ApiResponse<{ accessToken: string }>> {
    const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    return response.data;
  }
};

// Add interceptors
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops if refresh fails
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh' && originalRequest.url !== '/auth/login') {
      originalRequest._retry = true;
      try {
        const response = await authApi.refresh();
        if (response.success && response.data?.accessToken) {
          localStorage.setItem('accessToken', response.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle error messages from API
    if (error.response?.data?.error) {
      error.message = error.response.data.error;
    }

    return Promise.reject(error);
  }
);

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

// Scraping API
export const scrapingApi = {
  // Create a new scraping job
  async createJob(data: CreateScrapingJobData): Promise<ApiResponse<{ jobId: string; status: string; sourceUrl: string; sourceName: string; createdAt: string; message: string }>> {
    const response = await api.post<ApiResponse<{ jobId: string; status: string; sourceUrl: string; sourceName: string; createdAt: string; message: string }>>('/scraping/jobs', data);
    return response.data;
  },

  // Get all scraping jobs
  async getJobs(params?: { status?: string; sourceName?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<ScrapingJob>> {
    const response = await api.get<PaginatedResponse<ScrapingJob>>('/scraping/jobs', { params });
    return response.data;
  },

  // Get scraping job by ID
  async getJob(id: string): Promise<ApiResponse<ScrapingJob & { progress?: { currentPage: number; totalPages: number; percentage: number } }>> {
    const response = await api.get<ApiResponse<ScrapingJob & { progress?: { currentPage: number; totalPages: number; percentage: number } }>>(`/scraping/jobs/${id}`);
    return response.data;
  },

  // Get scraped listings for a job
  async getScrapedListings(jobId: string, params?: { importStatus?: string }): Promise<ApiResponse<ScrapedListing[]> & { meta?: { total: number; pending: number; imported: number; skipped: number; failed: number } }> {
    const response = await api.get<ApiResponse<ScrapedListing[]> & { meta?: { total: number; pending: number; imported: number; skipped: number; failed: number } }>(`/scraping/jobs/${jobId}/listings`, { params });
    return response.data;
  },

  // Import a single scraped listing
  async importListing(id: string, data?: ImportScrapedListingData): Promise<ApiResponse<{ scrapedListingId: string; listingId: string; importedAt: string; imagesDownloaded: number; descriptionsGenerated: boolean }>> {
    const response = await api.post<ApiResponse<{ scrapedListingId: string; listingId: string; importedAt: string; imagesDownloaded: number; descriptionsGenerated: boolean }>>(`/scraping/listings/${id}/import`, data);
    return response.data;
  },

  // Batch import multiple scraped listings
  async batchImport(data: { scrapedListingIds: string[]; downloadImages?: boolean; generateDescriptions?: boolean }): Promise<ApiResponse<BatchImportResult>> {
    const response = await api.post<ApiResponse<BatchImportResult>>('/scraping/listings/import-batch', data);
    return response.data;
  },

  // Skip (delete) a scraped listing
  async skipListing(id: string): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/scraping/listings/${id}`);
    return response.data;
  },

  // Get scraping configurations
  async getConfigs(): Promise<ApiResponse<ScrapingConfig[]>> {
    const response = await api.get<ApiResponse<ScrapingConfig[]>>('/scraping/configs');
    return response.data;
  },
};

export default api;
