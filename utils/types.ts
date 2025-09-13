/**
 * Comprehensive TypeScript types for the marketplace app
 * Centralized type definitions for better type safety and developer experience
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * User profile information
 */
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  location?: string;
  location_display?: string;
  latitude?: number;
  longitude?: number;
  isAvailable: boolean;
  verification_status?: 'verified' | 'not_verified';
  verified_at?: string;
  expires_at?: string;
  stats?: Record<string, any>;
  notification_settings?: NotificationSettings;
  created_at: string;
  updated_at: string;
}

/**
 * Notification settings for users
 */
export interface NotificationSettings {
  new_messages: boolean;
  listing_updates: boolean;
  marketplace_notifications: boolean;
}

/**
 * Marketplace listing
 */
export interface Listing {
  id: string;
  username: string;
  title: string;
  description?: string;
  price: number;
  price_unit: PriceUnit;
  category: Category;
  thumbnail_images: string[];
  preview_images: string[];
  image_folder_path?: string; // Image folder path for organized storage
  image_url?: string; // Legacy field for backward compatibility
  latitude?: number;
  longitude?: number;
  location?: any; // PostGIS geography type
  distance_km?: number; // Distance from user to listing
  expires_at?: string;
  extension_count?: number;
  view_count?: number; // Total views of this listing
  ping_count?: number; // Total pings received for this listing
  created_at: string;
}

/**
 * Service request
 */
export interface Request {
  id: string;
  requester_username: string; // Username for contact/call functionality
  requester_name?: string; // Requester name from database join
  requester_verified?: boolean; // Verification status from database
  title: string;
  description?: string;
  budget_min?: number;
  budget_max?: number;
  category: RequestCategory;
  location?: string;
  location_name?: string;
  location_district?: string;
  location_state?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number; // Distance from user to request
  expires_at?: string; // ISO timestamp when request expires
  updated_at: string;
}

/**
 * Chat conversation between users
 */
export interface Chat {
  id: string;
  listing_id?: string;
  participant_a: string;
  participant_b: string;
  last_message?: string;
  last_sender?: string;
  status: ChatStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Individual chat message
 */
export interface Message {
  id: string;
  chat_id: string;
  sender_username: string;
  text: string;
  status: MessageStatus;
  created_at: string;
}

/**
 * Ping request from buyer to seller
 */
export interface Ping {
  id: string;
  listing_id: string;
  sender_username: string;
  receiver_username: string;
  message: string;
  status: PingStatus;
  template_id?: string;
  sent_at: string;
  responded_at?: string;
  expires_at: string;
  response_time_minutes?: number;
  first_response_at?: string;
  response_message?: string;
}

/**
 * User activity tracking
 */
export interface Activity {
  id: string;
  username: string;
  type: ActivityType;
  listing_id?: string;
  status: ActivityStatus;
  created_at: string;
}

// ============================================================================
// ENUM TYPES
// ============================================================================

/**
 * Pricing units for listings
 */
export type PriceUnit = 
  | 'per_item'
  | 'per_kg'
  | 'per_piece'
  | 'per_pack'
  | 'per_bundle'
  | 'per_dozen'
  | 'per_basket'
  | 'per_plate'
  | 'per_serving'
  | 'per_hour'
  | 'per_service'
  | 'per_session'
  | 'per_day'
  | 'per_commission'
  | 'per_project'
  | 'per_week'
  | 'per_month';

/**
 * Marketplace categories
 */
export type Category = 
  | 'groceries'
  | 'electronics'
  | 'fashion'
  | 'home'
  | 'services'
  | 'vehicles'
  | 'books'
  | 'sports'
  | 'beauty'
  | 'toys'
  | 'health'
  | 'pets'
  | 'garden'
  | 'office'
  | 'music'
  | 'art'
  | 'collectibles'
  | 'other';

/**
 * Request categories for service requests
 */
export type RequestCategory = 
  | 'food_beverages'
  | 'groceries_essentials'
  | 'teachers_learning'
  | 'home_services'
  | 'events_media'
  | 'vehicles_travel'
  | 'electronics_appliances'
  | 'jobs_work'
  | 'health_wellness'
  | 'others';


/**
 * Chat status values
 */
export type ChatStatus = 'active' | 'archived' | 'blocked';

/**
 * Message status values
 */
export type MessageStatus = 'sent' | 'delivered' | 'read';

/**
 * Ping status values
 */
export type PingStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/**
 * Activity type values
 */
export type ActivityType = 
  | 'listing_created'
  | 'listing_updated'
  | 'listing_deleted'
  | 'ping_sent'
  | 'ping_received'
  | 'ping_responded'
  | 'message_sent'
  | 'message_received'
  | 'request_created'
  | 'request_chat_started'
  | 'request_message_sent'
  | 'request_message_received';

/**
 * Activity status values
 */
export type ActivityStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

// ============================================================================
// REWARDS SYSTEM TYPES
// ============================================================================

/**
 * User rewards information
 */
export interface UserRewards {
  id: string;
  username: string;
  total_omni_earned: number;
  total_omni_spent: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

/**
 * User streak information
 */
export interface UserStreak {
  username: string;
  current_streak: number;
  longest_streak: number;
  total_checkins: number;
  last_checkin_date: string;
  weekly_rewards: number;
  monthly_rewards: number;
  created_at: string;
  updated_at: string;
}

/**
 * User referral code
 */
export interface UserReferralCode {
  id: string;
  username: string;
  referral_code: string;
  is_active: boolean;
  created_at: string;
}

/**
 * User achievement
 */
export interface UserAchievement {
  id: string;
  username: string;
  achievement_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Daily check-in
 */
export interface DailyCheckin {
  id: string;
  username: string;
  checkin_date: string;
  omni_earned: number;
  created_at: string;
}

/**
 * Referral record
 */
export interface Referral {
  id: string;
  referrer_username: string;
  referred_username: string;
  referral_code: string;
  status: ReferralStatus;
  omni_rewarded: number;
  commission_rate: number;
  total_commission_earned: number;
  created_at: string;
  completed_at?: string;
}

/**
 * Referral commission record
 */
export interface ReferralCommission {
  id: string;
  referral_id: string;
  referrer_username: string;
  referred_username: string;
  commission_amount: number;
  source_transaction_id: string;
  source_type: string;
  source_amount: number;
  created_at: string;
}

/**
 * Reward transaction
 */
export interface RewardTransaction {
  id: string;
  username: string;
  transaction_type: TransactionType;
  amount: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  requirements: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

/**
 * User rewards summary
 */
export interface UserRewardsSummary {
  total_earned: number;
  total_spent: number;
  current_balance: number;
  current_streak: number;
  achievements_completed: number;
  total_achievements: number;
  referrals_count: number;
  checkins_this_month: number;
}

// ============================================================================
// REWARDS ENUM TYPES
// ============================================================================

/**
 * Referral status values
 */
export type ReferralStatus = 'pending' | 'completed' | 'expired';

/**
 * Transaction type values
 */
export type TransactionType = 
  | 'daily_checkin'
  | 'achievement_completed'
  | 'referral_bonus'
  | 'referral_commission'
  | 'listing_created'
  | 'ping_sent'
  | 'message_sent'
  | 'reward_spent'
  | 'bonus_granted';

/**
 * Achievement category values
 */
export type AchievementCategory = 
  | 'engagement'
  | 'social'
  | 'content'
  | 'milestone'
  | 'special';

/**
 * Achievement rarity values
 */
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/**
 * Image upload response
 */
export interface ImageUploadResponse {
  url: string;
  thumbnail_url?: string;
  preview_url?: string;
  size: number;
  width: number;
  height: number;
  mime_type: string;
}

/**
 * Compression result
 */
export interface CompressionResult {
  success: boolean;
  uri: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  error?: string;
  attempts: number;
  originalSize: number;
  compressionRatio: number;
}

// ============================================================================
// HOOK TYPES
// ============================================================================

/**
 * Location information
 */
export interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

/**
 * Ping limit information
 */
export interface PingLimitInfo {
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  time_limit_minutes: number;
  last_ping_time?: string;
  can_ping: boolean;
  time_remaining_minutes?: number;
}

/**
 * Listings hook state
 */
export interface ListingsState {
  listings: Listing[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  sortByDistance: boolean;
  maxDistance: number | null;
  locationAvailable: boolean;
  error?: string;
}

/**
 * Requests hook state
 */
export interface RequestsState {
  requests: Request[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  category: RequestCategory | null;
  locationAvailable: boolean;
  error?: string;
  lastRefresh: number;
}

/**
 * Messages hook state
 */
export interface MessagesState {
  messages: Message[];
  loading: boolean;
  error: string | null;
}

/**
 * Auth hook state
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial user type for updates
 */
export type PartialUser = Partial<User>;

/**
 * Partial listing type for updates
 */
export type PartialListing = Partial<Listing>;

/**
 * Partial message type for updates
 */
export type PartialMessage = Partial<Message>;

/**
 * Partial ping type for updates
 */
export type PartialPing = Partial<Ping>;

/**
 * Form data type for listings
 */
export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  price_unit: PriceUnit;
  category: Category;
  images: string[];
}

/**
 * Form data type for pings
 */
export interface PingFormData {
  message: string;
  template_id?: string;
}

/**
 * Form data type for messages
 */
export interface MessageFormData {
  text: string;
}

/**
 * Form data type for requests
 */
export interface RequestFormData {
  title: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
  category: RequestCategory;
  location?: string;
}

// ============================================================================
// RATING TYPES
// ============================================================================

/**
 * User rating data
 */
export interface UserRating {
  id: string;
  rater_username: string;
  rated_username: string;
  ping_id: string;
  rating: number;
  review_text?: string;
  category: RatingCategory;
  created_at: string;
  updated_at: string;
}

/**
 * User rating statistics
 */
export interface UserRatingStats {
  average_rating: number;
  total_ratings: number;
  rating_distribution: Record<string, number>;
}

/**
 * Rating eligibility information
 */
export interface RatingEligibility {
  can_rate: boolean;
  reason?: string; // Reason why user cannot rate
  pending_pings: Array<{
    ping_id: string;
    listing_title: string;
    created_at: string;
  }>;
}

/**
 * Rating form data for submission
 */
export interface RatingFormData {
  rating: number;
  review_text?: string;
  category: RatingCategory;
}

/**
 * Rating categories
 */
export type RatingCategory = 'overall' | 'communication' | 'responsiveness' | 'helpfulness';

/**
 * Props for RatingDisplay component
 */
export interface RatingDisplayProps {
  username: string;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
  showAverage?: boolean;
}

/**
 * Props for RatingModal component
 */
export interface RatingModalProps {
  visible: boolean;
  ratedUsername: string;
  pingId: string;
  onSubmit: (ratingData: RatingFormData) => void;
  onClose: () => void;
}

/**
 * Props for StarRating component
 */
export interface StarRatingProps {
  rating: number;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
}

/**
 * Search filters
 */
export interface SearchFilters {
  category?: Category;
  price_min?: number;
  price_max?: number;
  location?: LocationInfo;
  max_distance?: number;
  sort_by?: 'price' | 'date' | 'distance' | 'relevance';
  sort_order?: 'asc' | 'desc';
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  maxWidth: number;
  maxHeight: number;
  retryCount: number;
  retryDelay: number;
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Error information
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  userId?: string;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * App events for analytics
 */
export interface AppEvent {
  type: string;
  userId?: string;
  data?: Record<string, any>;
  timestamp: number;
}

/**
 * User interaction events
 */
export interface UserInteractionEvent extends AppEvent {
  type: 'listing_view' | 'ping_sent' | 'message_sent' | 'search_performed';
  listingId?: string;
  category?: Category;
  searchQuery?: string;
}

/**
 * Performance events
 */
export interface PerformanceEvent extends AppEvent {
  type: 'page_load' | 'api_call' | 'image_load';
  duration: number;
  success: boolean;
  error?: string;
} 