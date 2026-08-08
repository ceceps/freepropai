// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'solo_agent' | 'team_owner' | 'team_agent';
  regionScope?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
  phone?: string;
  role?: 'solo_agent' | 'team_owner' | 'team_agent';
  regionScope?: string;
}

// Listing Types
export interface Listing {
  id: string;
  user_id?: string | null;
  team_id?: string | null;
  title: string;
  land_area?: number;
  building_area?: number;
  location: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  region?: string;
  source_url?: string;
  additional_info?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  photo_url: string;
  photo_order: number;
  is_featured: boolean;
  uploaded_at: string;
}

export interface ListingDescription {
  id: string;
  listing_id: string;
  variant_type: 'formal' | 'casual_1' | 'casual_2';
  description_text: string;
  generated_at: string;
  is_selected: boolean;
  created_at: string;
}

export interface ListingWithDetails extends Listing {
  photos: ListingPhoto[];
  descriptions: ListingDescription[];
}

export interface CreateListingData {
  title: string;
  landArea?: number;
  buildingArea?: number;
  location: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  additionalInfo?: string;
  featuredPhotoId?: string;
  featuredPhotoIndex?: number;
}

export interface ListingSummary {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  status: string;
  photoCount: number;
  hasDescriptions: boolean;
  created_at: string;
  photos?: ListingPhoto[];
  land_area?: number;
  building_area?: number;
  thumbnailUrl?: string | null;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: {
    total: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

// Scraping Types
export interface ScrapingJob {
  id: string;
  sourceUrl: string;
  sourceName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalListingsFound: number;
  totalListingsImported: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapedListing {
  id: string;
  scrapingJobId: string;
  sourceUrl: string;
  sourceId?: string;
  title: string;
  landArea?: number;
  buildingArea?: number;
  location?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  region?: string;
  description?: string;
  imageUrls: string[];
  contactInfo?: {
    name?: string;
    phone?: string;
    whatsapp?: string;
  };
  rawData?: any;
  importStatus: 'pending' | 'imported' | 'skipped' | 'failed';
  importedListingId?: string;
  importedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScrapingJobData {
  sourceUrl: string;
  sourceName: string;
  maxPages?: number;
  filters?: {
    location?: string;
    propertyType?: string;
    priceMin?: number;
    priceMax?: number;
  };
}

export interface ImportScrapedListingData {
  downloadImages?: boolean;
  generateDescriptions?: boolean;
  additionalInfo?: string;
}

export interface BatchImportResult {
  totalRequested: number;
  successfulImports: number;
  failedImports: number;
  results: Array<{
    scrapedListingId: string;
    listingId?: string;
    status: 'success' | 'failed';
    error?: string;
  }>;
}

export interface ScrapingConfig {
  id: string;
  sourceName: string;
  baseUrl: string;
  isActive: boolean;
  maxPages: number;
  rateLimitDelay: number;
  notes?: string;
}