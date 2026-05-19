/* ═══ TaazaBandi — Type Definitions ═══ */

// ─── User & Auth ───
export type UserRole = 'customer' | 'driver' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  phone: string;
  name: string;
  avatar_url?: string;
  is_verified: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  default_address_id?: string;
  loyalty_points: number;
  referral_code: string;
  referred_by?: string;
}

export interface Address {
  id: string;
  customer_id: string;
  label: 'home' | 'office' | 'other';
  address: string;
  landmark?: string;
  pincode: string;
  lat: number;
  lng: number;
  is_default: boolean;
}

// ─── Zone & Slots ───
export interface Zone {
  id: string;
  name: string;          // e.g. 'Zone A: Jubilee Hills'
  pincode: string;       // '500075'
  areas: string[];       // ['Jubilee Hills', 'Filmnagar']
  morning_slot_capacity: number;
  evening_slot_capacity: number;
  is_active: boolean;
}

export interface Slot {
  id: string;
  zone_id: string;
  zone_name?: string;
  slot_type: 'morning' | 'evening';
  slot_label: string;    // '6:00 AM - 9:00 AM'
  date: string;          // '2026-05-15'
  total_capacity: number;
  booked_count: number;
  is_full: boolean;
  vans_assigned: number;
}

export interface VegetableItem {
  name: string;
  name_te?: string;
  quantity: string;    // '2 kg', '500g', '1 bunch'
  icon: string;        // emoji
}

export interface Bundle {
  id: string;
  name: string;
  name_te?: string;
  price: number;
  original_price?: number;
  description: string;
  image_url: string;
  vegetables: VegetableItem[];
  serves: string;       // 'Family of 4', 'Single person'
  frequency: string;    // 'Daily', 'Weekly'
  is_active: boolean;
  is_popular?: boolean;
  tag?: string;          // 'Best Value', 'Most Popular'
}

export interface AddOn {
  id: string;
  name: string;
  name_te?: string;
  price: number;
  unit: string;
  icon: string;
  is_available: boolean;
}

// ─── Subscription ───
export type SubscriptionFrequency = 'daily' | 'alternate' | 'weekly';

export interface Subscription {
  id: string;
  customer_id: string;
  bundle_id: string;
  frequency: SubscriptionFrequency;
  is_active: boolean;
  next_delivery_date: string;
  zone_id: string;
  slot_type: 'morning' | 'evening';
}

// ─── Orders ───
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'assigned'
  | 'picked'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'razorpay' | 'wallet';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface Order {
  id: string;
  customer_id: string;
  customer_name?: string;
  driver_id?: string;
  driver_name?: string;
  van_id?: string;
  slot_id: string;
  bundle_id: string;
  bundle_name?: string;
  add_ons?: AddOn[];
  status: OrderStatus;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_address: string;
  lat: number;
  lng: number;
  queue_position?: number;  // "Order #3 of 12"
  total_in_queue?: number;
  coupon_code?: string;
  discount_amount?: number;
  loyalty_points_used?: number;
  tip_amount?: number;
  created_at: string;
  delivered_at?: string;
  photo_proof_url?: string;
  special_instructions?: string;
}

// ─── Driver ───
export type DriverStatus = 'online' | 'offline' | 'break';
export type DriverApprovalStatus = 'pending' | 'approved' | 'rejected' | 'blocked';

export interface Driver {
  id: string;
  profile: Profile;
  aadhar_number: string;
  pan_number?: string;
  license_number: string;
  license_photo_url?: string;
  aadhar_photo_url?: string;
  is_approved: boolean;
  approval_status: DriverApprovalStatus;
  rating: number;
  total_deliveries: number;
  on_time_percentage: number;
  zone_id?: string;
  zone_name?: string;
  is_online: boolean;
  current_status: DriverStatus;
  current_van_id?: string;
  break_until?: string;
}

// ─── Vehicles ───
export type VehicleType = 'tata_ace' | 'mahindra' | 'maruti' | 'other';

export interface Vehicle {
  id: string;
  driver_id?: string;
  driver_name?: string;
  vehicle_number: string;
  vehicle_type: VehicleType;
  capacity_kg: number;
  current_load_kg: number;
  rc_photo_url?: string;
  insurance_valid_till: string;
  is_approved: boolean;
  status: 'available' | 'in_use' | 'maintenance';
}

// ─── Live Tracking ───
export interface LiveLocation {
  driver_id: string;
  lat: number;
  lng: number;
  last_update: string;
  current_order_id?: string;
  speed?: number;
  heading?: number;
}

// ─── Ratings ───
export interface VegetableRating {
  vegetable_name: string;
  rating: number;       // 1-5
}

export interface OrderRating {
  id: string;
  order_id: string;
  overall_rating: number;
  vegetable_ratings: VegetableRating[];
  comment?: string;
  issue_photo_url?: string;
  created_at: string;
}

// ─── Coupons & Loyalty ───
export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  max_discount?: number;
  valid_till: string;
  usage_limit: number;
  used_count: number;
  is_active: boolean;
}

// ─── Notifications ───
export type NotificationType =
  | 'order_confirmed'
  | 'van_assigned'
  | 'out_for_delivery'
  | 'arriving_soon'
  | 'delivered'
  | 'promotion'
  | 'referral';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  is_read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

// ─── Dashboard Metrics ───
export interface AdminMetrics {
  active_orders: number;
  online_drivers: number;
  filled_vans: number;
  revenue_today: number;
  revenue_week: number;
  revenue_month: number;
  total_customers: number;
  avg_rating: number;
}

export interface DriverEarnings {
  today: number;
  week: number;
  month: number;
  tips: number;
  next_payout_date: string;
}
