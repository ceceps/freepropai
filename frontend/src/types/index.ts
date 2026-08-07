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