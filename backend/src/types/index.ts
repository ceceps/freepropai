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
