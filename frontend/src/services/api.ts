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
  ScrapingConfig,
  Lead,
  FollowUp,
  QualifyLeadData,
  CreateLeadData,
  GenerateFollowUpData,
  VideoScriptOptions,
  VideoScriptResult,
  VideoScriptRecord,
  DashboardStats
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

    // Handle 401 Unauthenticated
    if (error.response?.status === 401) {
      // Avoid infinite loop during login/refresh
      if (originalRequest.url === '/auth/login') {
        if (error.response?.data?.error) {
          error.message = error.response.data.error;
        }
        return Promise.reject(error);
      }

      if (!originalRequest._retry && originalRequest.url !== '/auth/refresh') {
        originalRequest._retry = true;
        try {
          const response = await authApi.refresh();
          if (response.success && response.data?.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login page
          localStorage.removeItem('accessToken');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        // Token is invalid/expired and refresh failed or was already tried
        localStorage.removeItem('accessToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
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
    formData.append('price', String(data.price));
    
    if (data.landArea !== undefined && data.landArea !== null) formData.append('landArea', String(data.landArea));
    if (data.buildingArea !== undefined && data.buildingArea !== null) formData.append('buildingArea', String(data.buildingArea));
    if (data.bedrooms !== undefined && data.bedrooms !== null) formData.append('bedrooms', String(data.bedrooms));
    if (data.bathrooms !== undefined && data.bathrooms !== null) formData.append('bathrooms', String(data.bathrooms));
    if (data.propertyType !== undefined && data.propertyType !== null) formData.append('propertyType', data.propertyType);
    if (data.additionalInfo !== undefined && data.additionalInfo !== null) formData.append('additionalInfo', data.additionalInfo);
    
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

    if (data.title !== undefined && data.title !== null) formData.append('title', data.title);
    if (data.location !== undefined && data.location !== null) formData.append('location', data.location);
    if (data.price !== undefined && data.price !== null) formData.append('price', String(data.price));

    if (data.landArea !== undefined && data.landArea !== null) formData.append('landArea', String(data.landArea));
    if (data.buildingArea !== undefined && data.buildingArea !== null) formData.append('buildingArea', String(data.buildingArea));
    if (data.bedrooms !== undefined && data.bedrooms !== null) formData.append('bedrooms', String(data.bedrooms));
    if (data.bathrooms !== undefined && data.bathrooms !== null) formData.append('bathrooms', String(data.bathrooms));
    if (data.propertyType !== undefined && data.propertyType !== null) formData.append('propertyType', data.propertyType);
    if (data.additionalInfo !== undefined && data.additionalInfo !== null) formData.append('additionalInfo', data.additionalInfo);
    if (data.featuredPhotoId) formData.append('featuredPhotoId', data.featuredPhotoId);
    if (data.featuredPhotoIndex !== undefined && data.featuredPhotoIndex !== null) formData.append('featuredPhotoIndex', String(data.featuredPhotoIndex));

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

  // Generate video script
  async generateVideoScript(id: string, options?: VideoScriptOptions): Promise<ApiResponse<VideoScriptResult>> {
    const response = await api.post<ApiResponse<VideoScriptResult>>(
      `/listings/${id}/generate-video-script`,
      options || {}
    );
    return response.data;
  },

  // Save video script
  async saveVideoScript(id: string, data: { name: string; style: string; model: string; aspectRatio: string; customInstructions?: string; voiceOver?: any; script: string; voiceOverScript?: string | null; scriptJson: any }): Promise<ApiResponse<VideoScriptRecord>> {
    const response = await api.post<ApiResponse<VideoScriptRecord>>(
      `/listings/${id}/video-scripts`,
      data
    );
    return response.data;
  },

  // Get saved video scripts for listing
  async getVideoScripts(id: string): Promise<ApiResponse<VideoScriptRecord[]>> {
    const response = await api.get<ApiResponse<VideoScriptRecord[]>>(
      `/listings/${id}/video-scripts`
    );
    return response.data;
  },

  // Update a saved video script
  async updateVideoScript(scriptId: string, data: Partial<{ name: string; script: string; voiceOverScript?: string | null; scriptJson: any }>): Promise<ApiResponse<VideoScriptRecord>> {
    const response = await api.put<ApiResponse<VideoScriptRecord>>(
      `/listings/video-scripts/${scriptId}`,
      data
    );
    return response.data;
  },

  // Delete a saved video script
  async deleteVideoScript(scriptId: string): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(
      `/listings/video-scripts/${scriptId}`
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

  // Search listings for autocomplete (lead form)
  async searchListings(q?: string): Promise<ApiResponse<{ id: string; title: string; location: string; price: number | string; bedrooms?: number; bathrooms?: number; propertyType?: string }[]>> {
    const response = await api.get<ApiResponse<{ id: string; title: string; location: string; price: number | string; bedrooms?: number; bathrooms?: number; propertyType?: string }[]>>('/listings', { params: { q } });
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

// Lead API
export const leadApi = {
  async getAll(): Promise<ApiResponse<Lead[]>> {
    const response = await api.get<ApiResponse<Lead[]>>('/leads');
    return response.data;
  },

  async getById(id: string): Promise<ApiResponse<Lead>> {
    const response = await api.get<ApiResponse<Lead>>(`/leads/${id}`);
    return response.data;
  },

  async create(data: CreateLeadData): Promise<ApiResponse<Lead>> {
    const response = await api.post<ApiResponse<Lead>>('/leads', data);
    return response.data;
  },

  async qualify(data: QualifyLeadData): Promise<ApiResponse<Lead>> {
    const response = await api.post<ApiResponse<Lead>>('/leads/qualify', data);
    return response.data;
  },

  async update(id: string, data: Partial<Lead>): Promise<ApiResponse<Lead>> {
    const response = await api.patch<ApiResponse<Lead>>(`/leads/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/leads/${id}`);
    return response.data;
  },
};

// Follow-up API
export const followUpApi = {
  async getQueue(): Promise<ApiResponse<FollowUp[]>> {
    const response = await api.get<ApiResponse<FollowUp[]>>('/followups/queue');
    return response.data;
  },

  async generate(data: GenerateFollowUpData): Promise<ApiResponse<FollowUp>> {
    const response = await api.post<ApiResponse<FollowUp>>('/followups/generate', data);
    return response.data;
  },

  async approve(id: string, approvedBy?: string): Promise<ApiResponse<FollowUp>> {
    const response = await api.patch<ApiResponse<FollowUp>>(`/followups/${id}/approve`, { approvedBy });
    return response.data;
  },

  async reject(id: string, reason?: string): Promise<ApiResponse<FollowUp>> {
    const response = await api.patch<ApiResponse<FollowUp>>(`/followups/${id}/reject`, { reason });
    return response.data;
  },

  async edit(id: string, messageDraft: string): Promise<ApiResponse<FollowUp>> {
    const response = await api.patch<ApiResponse<FollowUp>>(`/followups/${id}/edit`, { messageDraft });
    return response.data;
  },

  async delete(id: string): Promise<ApiResponse> {
    const response = await api.delete<ApiResponse>(`/followups/${id}`);
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data;
  },
};

export default api;
