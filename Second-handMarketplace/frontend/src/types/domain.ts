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
  role?: UserRole | string | null;
  status?: string | null;
  rating?: number | null;
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
  category?: Category | null;
  seller?: Profile | null;
  image_url?: string | null;
  images?: string[] | null;
  location?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Transaction {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  product_name?: string | null;
  amount: number;
  status: TransactionStatus | string;
  payment_status?: PaymentStatus | string | null;
  payment_method?: PaymentMethod | string | null;
  payment_expires_at?: string | null;
  paid_at?: string | null;
  rejection_reason?: string | null;
  product?: Product | null;
  buyer?: Profile | null;
  seller?: Profile | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Review {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewed_user_id?: string | null;
  rating: number;
  comment?: string | null;
  reviewer?: Profile | null;
  created_at?: string | null;
}

export interface Conversation {
  id: string;
  product_id?: string | null;
  product?: Product | null;
  participants?: Profile[];
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
  metadata?: Record<string, Json | undefined> | null;
  created_at?: string | null;
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
  reporter?: Profile | null;
  product?: Product | null;
  created_at?: string | null;
  updated_at?: string | null;
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
