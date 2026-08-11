export type UserRole = 'solo_agent' | 'team_owner' | 'team_agent';
export type TeamRole = 'owner' | 'agent';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  regionScope?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  brandName?: string | null;
  brandLogoUrl?: string | null;
  brandColor?: string | null;
  brandTagline?: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
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
  role?: UserRole;
  regionScope?: string;
}

// Lead Types
export interface Lead {
  id: string;
  name: string;
  phone: string;
  budget_min?: number;
  budget_max?: number;
  location?: string;
  unit_type?: string;
  urgency?: 'immediate' | 'soon' | 'flexible';
  score: 'Hot' | 'Warm' | 'Cold';
  raw_chat_text: string;
  extracted_at: Date;
  last_contact_at?: Date;
  status: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LeadQualifyRequest {
  rawChatText: string;
  phoneNumber: string;
  contactName: string;
}

export interface ExtractedLeadInfo {
  budget?: {
    min: number;
    max: number;
  };
  location?: string;
  unitType?: string;
  urgency?: 'immediate' | 'soon' | 'flexible';
  bedrooms?: number;
  bathrooms?: number;
}

export interface LeadQualifyResponse {
  leadId: string;
  extractedInfo: ExtractedLeadInfo & {
    name: string;
    phone: string;
  };
  score: 'Hot' | 'Warm' | 'Cold';
  reasoning: string;
}

// Follow-up Types
export interface FollowUp {
  id: string;
  lead_id: string;
  message_draft: string;
  scheduled_for: Date;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  generated_at: Date;
  approved_at?: Date;
  approved_by?: string;
  sent_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FollowUpWithLead extends FollowUp {
  lead: {
    id: string;
    name: string;
    score: string;
    last_contact_at?: Date;
  };
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
  created_at: Date;
  updated_at: Date;
}

export interface ListingPhoto {
  id: string;
  listing_id: string;
  photo_url: string;
  photo_order: number;
  is_featured: boolean;
  uploaded_at: Date;
}

export interface ListingDescription {
  id: string;
  listing_id: string;
  variant_type: 'formal' | 'casual_1' | 'casual_2';
  description_text: string;
  generated_at: Date;
  is_selected: boolean;
  created_at: Date;
}

export interface ListingWithDetails extends Listing {
  photos: ListingPhoto[];
  descriptions: ListingDescription[];
}

export interface CreateListingRequest {
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
  userId?: string;
}

export interface GeneratedDescriptions {
  formal: string;
  casual_1: string;
  casual_2: string;
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
