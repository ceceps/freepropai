// Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  location?: string;
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

// Video Script Generator Types
export type VideoStyle = 'cinematic' | 'aerial' | 'lifestyle' | 'walkthrough';
export type VideoModel = 'runway' | 'veo' | 'pika' | 'kling' | 'sora';
export type AspectRatio = '16:9' | '9:16' | '4:5';
export type VOGender = 'pria' | 'wanita';
export type VOLanguage = 'indonesia' | 'inggris';
export type VOAgeRange = 'anak' | 'remaja' | 'dewasa_muda' | 'dewasa' | 'senior';

export interface VoiceOverConfig {
  enabled: boolean;
  gender?: VOGender;
  language?: VOLanguage;
  ageRange?: VOAgeRange;
}

export interface VideoScriptOptions {
  style?: VideoStyle;
  model?: VideoModel;
  aspectRatio?: AspectRatio;
  voiceOver?: VoiceOverConfig;
  customInstructions?: string;
}

export interface VideoOnScreenText {
  content: string;
  style: string;
  animation: string;
}

export interface VideoTransition {
  in: string;
  out: string;
}

export interface VideoSceneVisuals {
  description: string;
  camera: string;
  on_screen_text: VideoOnScreenText | null;
}

export interface VideoSceneAudio {
  ambient?: string;
  effects?: string;
  voice_over?: {
    text: string;
    style: string;
  };
}

export interface VideoScriptScene {
  scene_number: number;
  duration_seconds: number;
  transition: VideoTransition;
  visuals: VideoSceneVisuals;
  audio: VideoSceneAudio;
}

export interface VideoScriptJson {
  project: string;
  settings: {
    total_duration_seconds: number;
    resolution: string;
    aspect_ratio: string;
  };
  scenes: VideoScriptScene[];
}

export interface VideoScriptRecord {
  id: string;
  listing_id: string;
  name: string;
  style: VideoStyle;
  model: VideoModel;
  aspect_ratio: AspectRatio;
  custom_instructions: string | null;
  include_voice_over: boolean;
  voice_gender: string | null;
  voice_age: string | null;
  voice_language: string | null;
  script: string;
  voice_over_script: string | null;
  script_json: VideoScriptJson;
  created_at: string;
  updated_at: string;
}

export interface VideoScriptResult {
  listingId: string;
  style: VideoStyle;
  model: VideoModel;
  aspectRatio: AspectRatio;
  voiceOver?: VoiceOverConfig;
  script: string;
  voiceOverScript: string | null;
  scriptJson: VideoScriptJson;
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

export interface ListingAnalysis {
  buyerPersonas: {
    name: string;
    description: string;
    characteristics: string[];
  }[];
  targetMarket: {
    segment: string;
    profile: string;
  }[];
  marketingChannels: {
    channel: string;
    reasoning: string;
    tactics: string[];
  }[];
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

// Lead Types
export interface LeadListingRef {
  id: string;
  title: string | null;
  location: string | null;
  price: number | null;
  status: string | null;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  location?: string | null;
  unitType?: string | null;
  urgency: 'immediate' | 'soon' | 'flexible';
  score: 'Hot' | 'Warm' | 'Cold';
  rawChatText?: string | null;
  extractedAt?: string;
  lastContactAt?: string | null;
  status: string;
  listingId?: string | null;
  listing?: LeadListingRef | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QualifyLeadData {
  rawChatText: string;
  name?: string;
  phone?: string;
}

export interface CreateLeadData {
  name: string;
  phone: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  location?: string;
  unitType?: string;
  urgency?: Lead['urgency'];
  score?: Lead['score'];
  notes?: string;
  listingId?: string | null;
}

// Follow-up Types
export interface FollowUp {
  id: string;
  leadId: string;
  messageDraft: string;
  scheduledFor: string;
  status: 'pending' | 'approved' | 'rejected' | 'sent';
  generatedAt?: string;
  approvedAt?: string | null;
  approvedBy?: string | null;
  sentAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  lead?: Lead;
}

export interface GenerateFollowUpData {
  leadId: string;
  contextMessage?: string;
  scheduledForDays?: number;
}

// Dashboard Types
export interface DashboardCounts {
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  newLeads7d: number;
  totalListings: number;
  activeListings: number;
  draftListings: number;
  totalFollowUps: number;
  pendingFollowUps: number;
}

export interface DashboardRecentListing {
  id: string;
  title: string;
  location: string;
  price: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  status: string;
  createdAt: string;
}

export interface DashboardRecentFollowUp {
  id: string;
  leadId: string;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  leadName: string;
  leadPhone: string;
}

export interface DashboardStats {
  counts: DashboardCounts;
  recentLeads: Lead[];
  recentListings: DashboardRecentListing[];
  recentFollowUps: DashboardRecentFollowUp[];
}

// Pipeline (read-only freepropai_db) Types
export interface PipelineOverview {
  sources: number;
  listings: number;
  activeListings: number;
  analyses: number;
  promoContent: number;
  calendarItems: number;
  pendingCalendar: number;
}

export interface PipelineSource {
  id: number;
  code: string;
  name: string;
  baseUrl: string;
  isActive: boolean | null;
  lastStatus: string | null;
  lastError: string | null;
  lastScrapedAt: string | null;
  lastScrapedPage: number | null;
  lastScrapeMode: string | null;
  listingCount: number;
}

export interface PipelineListing {
  id: string;
  title: string | null;
  propertyType: string | null;
  price: number | null;
  pricePerM2: number | null;
  lb: number | null;
  lt: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage: number | null;
  floors: number | null;
  certificate: string | null;
  address: unknown;
  description: string | null;
  features: string[] | null;
  photos: string[] | null;
  photoLabels: unknown;
  featureImage: string | null;
  videoUrl: string | null;
  agentName: string | null;
  agentPhone: string | null;
  agency: string | null;
  status: string | null;
  isActive: boolean | null;
  marketStatus: string | null;
  sourceId: number | null;
  sourceUrl: string;
  scrapedAt: string;
  createdAt: string | null;
  sourceName: string | null;
  sourceCode: string | null;
}

export interface PipelineAnalysis {
  id: string;
  listingId: string | null;
  buyerPersona: string | null;
  sellingPoints: string | null;
  fullAnalysisMarkdown: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  listingTitle?: string | null;
  listingPrice?: number | null;
  listingPropertyType?: string | null;
  listingFeatureImage?: string | null;
}

export interface PipelinePromoContent {
  id: string;
  listingId: string | null;
  dayNum: number;
  seqNum: number;
  angle: string | null;
  posterSpec: unknown;
  captionHpsc: string | null;
  videoScript: string | null;
  videoMeta: unknown;
  createdAt: string | null;
  listingTitle?: string | null;
  listingFeatureImage?: string | null;
}

export interface PipelineCalendarItem {
  id: string;
  listingId: string | null;
  date: string;
  platform: string;
  contentType: string;
  hook: string | null;
  captionDraft: string | null;
  assetFiles: string[] | null;
  disclosureTags: string[] | null;
  approvalStatus: string | null;
  approvedBy: string | null;
  postedAt: string | null;
  performanceJson: unknown;
  createdAt: string | null;
  listingTitle?: string | null;
  listingFeatureImage?: string | null;
  approvedByName?: string | null;
}

export interface PipelinePosterSpec {
  ratio?: string | null;
  width?: number | null;
  height?: number | null;
  /** Public URL of the generated poster image (filesystem paths are stripped). */
  public_url?: string | null;
  elements?: Array<Record<string, unknown>> | null;
  [key: string]: unknown;
}

export interface PipelineVideoShot {
  shot?: number;
  time?: string;
  visual?: string;
  vo?: string;
}

export interface PipelineVideoMeta {
  ratio?: string | null;
  duration_s?: number | null;
  vo_profile?: string | null;
  storyboard?: PipelineVideoShot[] | null;
  [key: string]: unknown;
}

export interface PipelineCalendarPromo {
  id: string;
  angle: string | null;
  captionHpsc: string | null;
  posterSpec: PipelinePosterSpec | null;
  videoScript: string | null;
  videoMeta: PipelineVideoMeta | null;
}

export interface PipelineCalendarDetail extends PipelineCalendarItem {
  promo: PipelineCalendarPromo | null;
}

export interface PipelineListingDetail extends PipelineListing {
  analysis: PipelineAnalysis | null;
  promoContent: PipelinePromoContent[];
  calendar: PipelineCalendarItem[];
}

export interface PipelineFacets {
  platforms: string[];
  approvalStatuses: string[];
  marketStatuses: string[];
  contentTypes: string[];
}

export type PipelineListResponse<T> = ApiResponse<T[]> & {
  total: number;
  limit: number;
  offset: number;
};