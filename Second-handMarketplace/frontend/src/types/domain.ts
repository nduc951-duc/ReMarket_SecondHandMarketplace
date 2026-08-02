export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

export type UserRole = 'customer' | 'seller' | 'agent' | 'admin';
export type ProductStatus = 'active' | 'hidden' | 'sold' | 'inactive';
export type TransactionStatus =
  | 'awaiting_payment'
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'completed'
  | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'expired' | 'cod';
export type PaymentMethod = 'cod' | 'momo' | 'vnpay';
export type ReportStatus = 'submitted' | 'in_review' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  address?: string | null;
  bio?: string | null;
  role?: UserRole | string | null;
  status?: string | null;
  rating?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_metadata?: Record<string, Json | undefined>;
}

export interface Category {
  id: string;
  name: string;
  slug?: string | null;
  icon?: string | null;
  image_url?: string | null;
  count?: number;
}

export interface Product {
  id: string;
  seller_id: string;
  title: string;
  description?: string | null;
  price: number;
  status: ProductStatus | string;
  condition?: string | null;
  category_id?: string | null;
  category?: Category | string | null;
  seller?: Profile | null;
  profiles?:
    | (Profile & {
        verified?: boolean;
        rating_avg?: number | null;
        rating_count?: number | null;
      })
    | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  images?: string[] | null;
  location?: string | null;
  view_count?: number | null;
  comment_count?: number | null;
  avg_rating?: number | null;
  rating_count?: number | null;
  is_negotiable?: boolean | null;
  isHot?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  condition?: string;
  min_price?: string | number;
  max_price?: string | number;
  city?: string;
  sort?: string;
  status?: string;
}

export interface ProductListResult {
  products: Product[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    matchMode?: 'exact' | 'fuzzy' | string;
  };
}

export interface WishlistItem {
  id?: string;
  user_id?: string;
  product_id: string;
  product: Product | null;
  created_at?: string | null;
}

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  product_name?: string | null;
  product_image?: string | null;
  note?: string | null;
  amount: number;
  status: TransactionStatus | string;
  payment_status?: PaymentStatus | string | null;
  payment_method?: PaymentMethod | string | null;
  payment_expires_at?: string | null;
  paid_at?: string | null;
  rejection_reason?: string | null;
  confirmed_at?: string | null;
  shipped_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  product?: Product | null;
  buyer?: Profile | null;
  seller?: Profile | null;
  my_review?: Review | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Review {
  id: string;
  transaction_id: string;
  product_id?: string | null;
  reviewer_id: string;
  reviewed_user_id?: string | null;
  rating: number;
  comment?: string | null;
  reviewer?: Profile | null;
  reviewer_profile?: Profile | null;
  created_at?: string | null;
}

export interface ConversationParticipant {
  user_id: string;
  conversation_id?: string;
  last_read_at?: string | null;
  profile?: Profile | null;
}

export interface Conversation {
  id: string;
  product_id?: string | null;
  product?: Product | null;
  participants?: ConversationParticipant[];
  peer?: ConversationParticipant | null;
  latest_message?: Message | null;
  last_message?: Message | null;
  unread_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  client_message_id?: string | null;
  sender?: Profile | null;
  sender_profile?: Profile | null;
  is_system?: boolean;
  metadata?: Record<string, Json | undefined> | null;
  status?: 'sending' | 'sent' | 'failed';
  read_at?: string | null;
  created_at?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  is_read?: boolean;
  conversation_id?: string | null;
  transaction_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, Json | undefined> | null;
  created_at?: string | null;
}

export interface TransactionListResult {
  transactions: Transaction[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface TransactionStats {
  totalBuy?: number;
  completedBuy?: number;
  totalSell?: number;
  completedSell?: number;
}

export interface ChatMessagePage {
  conversation?: Conversation | null;
  messages: Message[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface NotificationListResult {
  notifications: Notification[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'product' | 'user';
  product_id?: string | null;
  reported_user_id?: string | null;
  reason: string;
  details?: string | null;
  evidence_urls?: string[];
  status: ReportStatus | string;
  resolution_action?: string | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  assigned_to?: string | null;
  moderator_id?: string | null;
  reporter?: Profile | null;
  product?: Product | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminOverview {
  users: {
    total: number;
    emailConfirmed: number;
  };
  products: {
    total: number;
    byStatus: Record<string, number>;
  };
  transactions: {
    total: number;
    byStatus: Record<string, number>;
    totalRevenue: number;
  };
}

export interface AdminUser extends Profile {
  email: string;
  role: UserRole | string;
  status: string;
}

export interface AdminUserListResult {
  items: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminProductListResult {
  products: Product[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminTransactionListResult {
  transactions: Transaction[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
}

export interface ApiErrorPayload {
  success?: false;
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    fields?: Record<string, string[]>;
  };
  message?: string;
}
