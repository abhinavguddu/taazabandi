-- ═══════════════════════════════════════════════════════════
-- 🥬 TAAZABANDI — Database Schema v2.0
-- Zone-Based Bundle Delivery Platform
-- Initial Launch Pincode: 500075 (Hyderabad)
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geography types

-- ─── Profiles (extends Supabase Auth) ───
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'admin')) DEFAULT 'customer',
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Customers ───
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_address_id UUID,
  loyalty_points INT DEFAULT 0,
  referral_code TEXT UNIQUE DEFAULT ('TB' || SUBSTRING(uuid_generate_v4()::text, 1, 6)),
  referred_by UUID REFERENCES customers(id),
  subscription_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Addresses ───
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (label IN ('home', 'office', 'other')) DEFAULT 'home',
  address TEXT NOT NULL,
  landmark TEXT,
  pincode TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Zones ───
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- 'Zone A: Jubilee Hills'
  pincode TEXT NOT NULL,                 -- '500075'
  areas TEXT[] DEFAULT '{}',             -- {'Jubilee Hills', 'Filmnagar'}
  boundary GEOGRAPHY(POLYGON) NULL,     -- GeoJSON polygon for map display
  morning_slot_capacity INT DEFAULT 250,
  evening_slot_capacity INT DEFAULT 150,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Bundles (replaces individual products) ───
CREATE TABLE IF NOT EXISTS bundles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                    -- 'Family Pack'
  name_te TEXT,                          -- Telugu name for search
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  description TEXT,
  image_url TEXT,
  vegetables JSONB NOT NULL DEFAULT '[]', -- [{"name":"Potato","quantity":"2kg","icon":"🥔"}]
  serves TEXT,                           -- 'Family of 4'
  frequency TEXT,                        -- 'Every 3 days'
  tag TEXT,                              -- 'Most Popular'
  is_active BOOLEAN DEFAULT true,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Add-Ons ───
CREATE TABLE IF NOT EXISTS add_ons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_te TEXT,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  icon TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Drivers ───
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  aadhar_number TEXT UNIQUE,
  pan_number TEXT,
  license_number TEXT UNIQUE,
  license_photo_url TEXT,
  aadhar_photo_url TEXT,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'blocked')),
  is_approved BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_deliveries INT DEFAULT 0,
  on_time_percentage DECIMAL(5,2) DEFAULT 100.00,
  zone_id UUID REFERENCES zones(id),
  is_online BOOLEAN DEFAULT false,
  current_status TEXT DEFAULT 'offline' CHECK (current_status IN ('online', 'offline', 'break')),
  current_van_id UUID,
  break_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Vehicles ───
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id),
  vehicle_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT DEFAULT 'tata_ace' CHECK (vehicle_type IN ('tata_ace', 'mahindra', 'maruti', 'other')),
  capacity_kg INT DEFAULT 500,
  current_load_kg INT DEFAULT 0,
  rc_photo_url TEXT,
  insurance_valid_till DATE,
  is_approved BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for drivers.current_van_id after vehicles table exists
ALTER TABLE drivers ADD CONSTRAINT fk_driver_van FOREIGN KEY (current_van_id) REFERENCES vehicles(id);

-- ─── Slots (dynamic — generated daily per zone) ───
CREATE TABLE IF NOT EXISTS slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES zones(id),
  slot_type TEXT NOT NULL CHECK (slot_type IN ('morning', 'evening')),
  slot_label TEXT NOT NULL,              -- '6:00 AM - 9:00 AM'
  date DATE NOT NULL,
  total_capacity INT NOT NULL,
  booked_count INT DEFAULT 0,
  is_full BOOLEAN DEFAULT false,
  vans_assigned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(zone_id, slot_type, date)
);

-- ─── Orders ───
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  driver_id UUID REFERENCES drivers(id),
  van_id UUID REFERENCES vehicles(id),
  slot_id UUID NOT NULL REFERENCES slots(id),
  bundle_id UUID NOT NULL REFERENCES bundles(id),
  add_on_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','assigned','picked','out_for_delivery','delivered','cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cod' CHECK (payment_method IN ('cod', 'razorpay', 'wallet')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  delivery_address TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  queue_position INT,
  coupon_code TEXT,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  loyalty_points_used INT DEFAULT 0,
  tip_amount DECIMAL(10,2) DEFAULT 0,
  special_instructions TEXT,
  photo_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Live Locations ───
CREATE TABLE IF NOT EXISTS live_locations (
  driver_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION DEFAULT 0,
  heading DOUBLE PRECISION DEFAULT 0,
  current_order_id UUID REFERENCES orders(id),
  last_update TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Order Ratings ───
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  overall_rating INT NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  vegetable_ratings JSONB DEFAULT '[]', -- [{"name":"Potato","rating":4}]
  comment TEXT,
  issue_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Coupons ───
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  valid_till TIMESTAMPTZ,
  usage_limit INT DEFAULT 100,
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Subscriptions ───
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bundle_id UUID NOT NULL REFERENCES bundles(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'alternate', 'weekly')),
  zone_id UUID NOT NULL REFERENCES zones(id),
  slot_type TEXT NOT NULL CHECK (slot_type IN ('morning', 'evening')),
  is_active BOOLEAN DEFAULT true,
  next_delivery_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ───
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ Row Level Security ═══
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read own, admins can read all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Customers: Own data only
CREATE POLICY "Customers can view own data" ON customers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Customers can update own data" ON customers FOR UPDATE USING (auth.uid() = id);

-- Addresses: Own addresses
CREATE POLICY "Customers can manage own addresses" ON addresses FOR ALL USING (auth.uid() = customer_id);

-- Orders: Customers see own, drivers see assigned
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Drivers can view assigned orders" ON orders FOR SELECT USING (auth.uid() = driver_id);

-- Public read access for bundles, zones, slots, add_ons
ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bundles are publicly readable" ON bundles FOR SELECT USING (true);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zones are publicly readable" ON zones FOR SELECT USING (true);

ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Slots are publicly readable" ON slots FOR SELECT USING (true);

ALTER TABLE add_ons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Add-ons are publicly readable" ON add_ons FOR SELECT USING (true);

-- ═══ Seed Data ═══

-- Zones for Hyderabad 500075
INSERT INTO zones (name, pincode, areas, morning_slot_capacity, evening_slot_capacity) VALUES
  ('Zone A: Jubilee Hills', '500075', ARRAY['Jubilee Hills', 'Filmnagar', 'Yousufguda'], 250, 150),
  ('Zone B: Banjara Hills', '500075', ARRAY['Banjara Hills', 'Road No. 1-14', 'Panjagutta'], 200, 120),
  ('Zone C: Madhapur', '500075', ARRAY['Madhapur', 'Hitec City', 'Kondapur'], 300, 180);

-- Bundles
INSERT INTO bundles (name, name_te, price, original_price, description, serves, frequency, tag, is_popular, vegetables) VALUES
  ('Family Pack', 'కుటుంబ ప్యాక్', 299, 450, 'Perfect for a family of 4. Fresh vegetables for 3-4 days.', 'Family of 4', 'Every 3 days', 'Most Popular', true,
   '[{"name":"Potato","quantity":"2 kg","icon":"🥔"},{"name":"Onion","quantity":"1 kg","icon":"🧅"},{"name":"Tomato","quantity":"1 kg","icon":"🍅"},{"name":"Green Chilli","quantity":"250g","icon":"🌶️"},{"name":"Cauliflower","quantity":"1 piece","icon":"🥦"},{"name":"Spinach","quantity":"1 bunch","icon":"🥬"},{"name":"Carrot","quantity":"500g","icon":"🥕"},{"name":"Capsicum","quantity":"250g","icon":"🫑"}]'),
  ('Single Pack', 'సింగిల్ ప్యాక్', 199, 280, 'Ideal for bachelors & couples. Compact daily essentials.', '1-2 persons', 'Every 3 days', 'Best Value', false,
   '[{"name":"Potato","quantity":"1 kg","icon":"🥔"},{"name":"Onion","quantity":"500g","icon":"🧅"},{"name":"Tomato","quantity":"500g","icon":"🍅"},{"name":"Green Chilli","quantity":"100g","icon":"🌶️"},{"name":"Coriander","quantity":"1 bunch","icon":"🌿"},{"name":"Lady Finger","quantity":"250g","icon":"🫛"}]'),
  ('Weekly Mega Pack', 'వారపు మెగా ప్యాక్', 599, 900, 'Complete weekly supply for a large family. 15+ vegetables!', 'Family of 5-6', 'Weekly', 'Max Savings', false,
   '[{"name":"Potato","quantity":"3 kg","icon":"🥔"},{"name":"Onion","quantity":"2 kg","icon":"🧅"},{"name":"Tomato","quantity":"2 kg","icon":"🍅"},{"name":"Green Chilli","quantity":"500g","icon":"🌶️"},{"name":"Cauliflower","quantity":"2 pieces","icon":"🥦"},{"name":"Spinach","quantity":"2 bunches","icon":"🥬"},{"name":"Carrot","quantity":"1 kg","icon":"🥕"},{"name":"Capsicum","quantity":"500g","icon":"🫑"},{"name":"Coriander","quantity":"2 bunches","icon":"🌿"},{"name":"Lady Finger","quantity":"500g","icon":"🫛"},{"name":"Brinjal","quantity":"500g","icon":"🍆"},{"name":"Bottle Gourd","quantity":"1 piece","icon":"🥒"},{"name":"Beans","quantity":"250g","icon":"🫘"},{"name":"Ginger","quantity":"200g","icon":"🫚"},{"name":"Garlic","quantity":"200g","icon":"🧄"}]');

-- Add-Ons
INSERT INTO add_ons (name, name_te, price, unit, icon) VALUES
  ('Coriander', 'కొత్తిమీర', 10, 'bunch', '🌿'),
  ('Lemon', 'నిమ్మకాయ', 15, '4 pieces', '🍋'),
  ('Green Chilli', 'పచ్చిమిర్చి', 10, '100g', '🌶️'),
  ('Ginger', 'అల్లం', 20, '100g', '🫚'),
  ('Mint', 'పుదీనా', 10, 'bunch', '🌱'),
  ('Curry Leaves', 'కరివేపాకు', 5, 'sprig', '🍃');

-- Sample Coupon
INSERT INTO coupons (code, type, value, min_order_amount, max_discount, valid_till) VALUES
  ('TAAZA50', 'fixed', 50, 199, 50, NOW() + INTERVAL '30 days'),
  ('FRESH10', 'percentage', 10, 299, 100, NOW() + INTERVAL '30 days');
