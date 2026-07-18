-- ============================================================
-- QLekha by ForjitAI — Complete Supabase Database Schema
-- Version: 1.0.0
-- Description: Full schema for window business quoting SaaS
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'sales',
  'accounts',
  'workshop',
  'viewer'
);

CREATE TYPE material_type AS ENUM (
  'aluminium',
  'upvc',
  'glass',
  'mixed'
);

CREATE TYPE quote_status AS ENUM (
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired'
);

CREATE TYPE bill_status AS ENUM (
  'draft',
  'sent',
  'paid',
  'partial',
  'pending',
  'overdue',
  'cancelled'
);

CREATE TYPE payment_mode AS ENUM (
  'cash',
  'bank_transfer',
  'upi',
  'cheque',
  'card',
  'other'
);

CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'quoted',
  'negotiating',
  'won',
  'lost'
);

CREATE TYPE client_tag AS ENUM (
  'architect',
  'builder',
  'contractor',
  'individual',
  'dealer',
  'corporate'
);

CREATE TYPE accessory_type AS ENUM (
  'handle',
  'hinge',
  'roller',
  'lock',
  'seal',
  'mesh',
  'other'
);

CREATE TYPE window_system AS ENUM (
  'sliding',
  'casement',
  'fixed',
  'door',
  'partition',
  'louvre',
  'other'
);

CREATE TYPE cutting_status AS ENUM (
  'pending',
  'in_progress',
  'cut',
  'dispatched'
);

CREATE TYPE plan_type AS ENUM (
  'trial',
  'starter',
  'growth',
  'pro',
  'enterprise'
);

CREATE TYPE notification_type AS ENUM (
  'quote_sent',
  'quote_approved',
  'payment_received',
  'payment_overdue',
  'follow_up',
  'low_stock',
  'system'
);

CREATE TYPE language_code AS ENUM (
  'en', 'hi', 'gu', 'mr', 'pa',
  'bn', 'kn', 'ml', 'ta', 'te',
  'or', 'as', 'ur', 'raj'
);

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ── 1. COMPANIES ──────────────────────────────────────────
CREATE TABLE companies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  owner_name        TEXT,
  phone             TEXT NOT NULL,
  phone_alt         TEXT,
  email             TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  pincode           TEXT,
  country           TEXT DEFAULT 'India',
  gst_number        TEXT,
  pan_number        TEXT,
  logo_url          TEXT,

  -- Bank details
  bank_name         TEXT,
  account_number    TEXT,
  ifsc_code         TEXT,
  account_holder    TEXT,
  upi_id            TEXT,

  -- PDF settings
  profile_detail    TEXT,           -- Rich text intro letter
  terms_quotation   TEXT,           -- T&C for quotes
  terms_billing     TEXT,           -- T&C for invoices
  terms_pi          TEXT,           -- T&C for proforma
  pdf_design        TEXT DEFAULT 'classic_blue',
  cutting_design    TEXT DEFAULT 'default',
  formula_override  TEXT,           -- Custom formula: (w*h)/NUMBER
  installation_sqft NUMERIC(10,2),  -- Installation per sqft rate
  area_condition    BOOLEAN DEFAULT false,
  upvc_new_layout   BOOLEAN DEFAULT false,
  hide_rate_pdf     BOOLEAN DEFAULT false,
  show_avg_rate     BOOLEAN DEFAULT false,
  special_alum_formula BOOLEAN DEFAULT false,
  auto_price_calc   BOOLEAN DEFAULT true,

  -- Plan
  plan              plan_type DEFAULT 'trial',
  plan_expires_at   TIMESTAMPTZ,
  trial_started_at  TIMESTAMPTZ DEFAULT NOW(),

  -- i18n
  default_language  language_code DEFAULT 'en',

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. USERS ──────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  role            user_role DEFAULT 'sales',
  language        language_code DEFAULT 'en',
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT true,
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. CLIENTS ────────────────────────────────────────────
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  phone_alt       TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  gst_number      TEXT,
  pan_number      TEXT,
  tag             client_tag DEFAULT 'individual',
  notes           TEXT,

  -- Computed / cached
  total_quotes    INTEGER DEFAULT 0,
  total_billed    NUMERIC(12,2) DEFAULT 0,
  total_paid      NUMERIC(12,2) DEFAULT 0,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. PROFILE COMPANIES (Aluminium brands) ───────────────
CREATE TABLE profile_companies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,        -- e.g. "SBPL", "Jindal"
  code            TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. PROFILES (Aluminium profile catalogue) ─────────────
CREATE TABLE profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_company_id UUID REFERENCES profile_companies(id),
  profile_code      TEXT NOT NULL,
  profile_name      TEXT NOT NULL,
  brand             TEXT,
  gi_name           TEXT,             -- GI (Gross Index) name
  system            window_system DEFAULT 'sliding',
  material          material_type DEFAULT 'aluminium',
  price_per_kg      NUMERIC(10,2) DEFAULT 0,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, profile_code)
);

-- ── 6. PROFILE WEIGHT PRICES (per colour) ─────────────────
CREATE TABLE profile_weight_prices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  profile_company_id UUID REFERENCES profile_companies(id),
  colour          TEXT NOT NULL,        -- e.g. "white", "grey", "black"
  colour_code     TEXT,                 -- hex or name code
  price_per_kg    NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. GLASS TYPES ────────────────────────────────────────
CREATE TABLE glass_types (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  thickness_mm    NUMERIC(5,2),
  glass_type      TEXT,               -- clear, frosted, tinted, dgu, laminated
  colour          TEXT,
  hsn_code        TEXT DEFAULT '7005',
  price_per_sqft  NUMERIC(10,2) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. ACCESSORIES ────────────────────────────────────────
CREATE TABLE accessories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type            accessory_type NOT NULL,
  name            TEXT NOT NULL,
  code            TEXT,
  price           NUMERIC(10,2) DEFAULT 0,
  photo_url       TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUOTATION TABLES
-- ============================================================

-- ── 9. QUOTES ─────────────────────────────────────────────
CREATE TABLE quotes (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id),
  profile_company_id  UUID REFERENCES profile_companies(id),
  created_by          UUID REFERENCES users(id),

  -- Identity
  quote_number        TEXT NOT NULL,    -- e.g. "Q-2025-035"
  version             INTEGER DEFAULT 1,
  reference           TEXT,
  material_type       material_type DEFAULT 'aluminium',

  -- Client snapshot (denormalised for PDF)
  client_name         TEXT NOT NULL,
  client_phone        TEXT,
  client_email        TEXT,
  client_address      TEXT,

  -- Status
  status              quote_status DEFAULT 'draft',
  sent_at             TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,

  -- Financials
  base_amount         NUMERIC(12,2) DEFAULT 0,
  installation        NUMERIC(12,2) DEFAULT 0,
  transport           NUMERIC(12,2) DEFAULT 0,
  discount_pct        NUMERIC(5,2) DEFAULT 0,
  discount_amount     NUMERIC(12,2) DEFAULT 0,
  sub_total           NUMERIC(12,2) DEFAULT 0,
  gst_enabled         BOOLEAN DEFAULT true,
  gst_rate            NUMERIC(5,2) DEFAULT 18,
  igst_enabled        BOOLEAN DEFAULT false,
  cgst_amount         NUMERIC(12,2) DEFAULT 0,
  sgst_amount         NUMERIC(12,2) DEFAULT 0,
  igst_amount         NUMERIC(12,2) DEFAULT 0,
  grand_total         NUMERIC(12,2) DEFAULT 0,

  -- Display settings
  hide_rate           BOOLEAN DEFAULT false,
  show_avg_rate       BOOLEAN DEFAULT false,

  -- PDF
  pdf_url             TEXT,
  pdf_design          TEXT DEFAULT 'classic_blue',

  -- Notes
  notes               TEXT,

  -- WhatsApp tracking
  wa_sent_at          TIMESTAMPTZ,
  wa_delivered_at     TIMESTAMPTZ,
  wa_read_at          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, quote_number)
);

-- ── 10. QUOTE ITEMS ───────────────────────────────────────
CREATE TABLE quote_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id          UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sort_order        INTEGER DEFAULT 0,

  -- Description
  title             TEXT,             -- e.g. "Living Room Sliding Window"
  window_type       TEXT,             -- e.g. "2 Track Sliding"
  material_type     material_type DEFAULT 'aluminium',

  -- Glass
  glass_type_id     UUID REFERENCES glass_types(id),
  glass_name        TEXT,             -- snapshot

  -- Accessory
  accessory_id      UUID REFERENCES accessories(id),
  hardware_name     TEXT,             -- snapshot

  -- Dimensions
  width_mm          NUMERIC(10,2),
  height_mm         NUMERIC(10,2),
  unit              TEXT DEFAULT 'mm', -- mm, inch, ft
  unit_area_sqft    NUMERIC(10,4),
  total_area_sqft   NUMERIC(10,4),
  quantity          INTEGER DEFAULT 1,

  -- Colour
  colour            TEXT,

  -- Pricing
  profile_rate_per_kg NUMERIC(10,2),
  profile_weight_kg   NUMERIC(10,4),
  profile_cost        NUMERIC(12,2),
  glass_rate_sqft     NUMERIC(10,2),
  glass_cost          NUMERIC(12,2),
  hardware_cost       NUMERIC(12,2) DEFAULT 0,
  rate_per_sqft       NUMERIC(10,2),  -- effective
  item_value          NUMERIC(12,2),  -- before qty
  total_amount        NUMERIC(12,2),  -- after qty

  -- HSN
  hsn_code          TEXT DEFAULT '7610',

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 11. LETTER HEADERS ────────────────────────────────────
CREATE TABLE letter_headers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id),
  client_name   TEXT,
  content       TEXT,               -- Rich text / HTML
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BILLING TABLES
-- ============================================================

-- ── 12. PROFORMA INVOICES ─────────────────────────────────
CREATE TABLE proforma_invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id),
  quote_id          UUID REFERENCES quotes(id),
  created_by        UUID REFERENCES users(id),

  -- Identity
  pi_number         TEXT NOT NULL,   -- e.g. "PI-2025-013"
  date              DATE DEFAULT CURRENT_DATE,
  po_number         TEXT,            -- Buyer's PO ref
  consignee         TEXT,

  -- Client snapshot
  client_name       TEXT NOT NULL,
  client_phone      TEXT,
  client_gst        TEXT,
  billing_address   TEXT,

  -- Financials
  base_amount       NUMERIC(12,2) DEFAULT 0,
  installation      NUMERIC(12,2) DEFAULT 0,
  transport         NUMERIC(12,2) DEFAULT 0,
  discount_pct      NUMERIC(5,2) DEFAULT 0,
  discount_amount   NUMERIC(12,2) DEFAULT 0,
  sub_total         NUMERIC(12,2) DEFAULT 0,
  gst_rate          NUMERIC(5,2) DEFAULT 18,
  cgst_amount       NUMERIC(12,2) DEFAULT 0,
  sgst_amount       NUMERIC(12,2) DEFAULT 0,
  igst_enabled      BOOLEAN DEFAULT false,
  igst_amount       NUMERIC(12,2) DEFAULT 0,
  grand_total       NUMERIC(12,2) DEFAULT 0,

  -- Payment
  status            bill_status DEFAULT 'draft',
  paid_amount       NUMERIC(12,2) DEFAULT 0,
  balance_due       NUMERIC(12,2),

  -- PDF
  pdf_url           TEXT,
  wa_sent_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, pi_number)
);

-- ── 13. PROFORMA ITEMS ────────────────────────────────────
CREATE TABLE proforma_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pi_id           UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),
  sort_order      INTEGER DEFAULT 0,
  description     TEXT NOT NULL,
  type            TEXT,              -- MM / Inch / SqFt
  hsn_code        TEXT DEFAULT '7610',
  width_mm        NUMERIC(10,2),
  height_mm       NUMERIC(10,2),
  unit_area_sqft  NUMERIC(10,4),
  total_area_sqft NUMERIC(10,4),
  quantity        INTEGER DEFAULT 1,
  rate            NUMERIC(10,2),
  value           NUMERIC(12,2),
  total_amount    NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 14. TAX INVOICES ──────────────────────────────────────
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id),
  quote_id          UUID REFERENCES quotes(id),
  pi_id             UUID REFERENCES proforma_invoices(id),
  created_by        UUID REFERENCES users(id),

  -- Identity
  invoice_number    TEXT NOT NULL,   -- e.g. "INV-2025-015"
  bill_no           TEXT,
  date              DATE DEFAULT CURRENT_DATE,
  delivery_date     DATE,
  reverse_charge    BOOLEAN DEFAULT false,

  -- Client snapshot
  client_name       TEXT NOT NULL,
  client_phone      TEXT,
  client_email      TEXT,
  client_gst        TEXT,
  billing_address   TEXT,
  delivery_address  TEXT,
  delivery_phone    TEXT,

  -- Financials
  base_amount       NUMERIC(12,2) DEFAULT 0,
  installation      NUMERIC(12,2) DEFAULT 0,
  transport         NUMERIC(12,2) DEFAULT 0,
  discount_pct      NUMERIC(5,2) DEFAULT 0,
  discount_amount   NUMERIC(12,2) DEFAULT 0,
  taxable_amount    NUMERIC(12,2) DEFAULT 0,
  gst_rate          NUMERIC(5,2) DEFAULT 18,
  cgst_amount       NUMERIC(12,2) DEFAULT 0,
  sgst_amount       NUMERIC(12,2) DEFAULT 0,
  igst_enabled      BOOLEAN DEFAULT false,
  igst_amount       NUMERIC(12,2) DEFAULT 0,
  round_off         NUMERIC(8,2) DEFAULT 0,
  grand_total       NUMERIC(12,2) DEFAULT 0,
  amount_in_words   TEXT,

  -- Payment
  status            bill_status DEFAULT 'draft',
  paid_amount       NUMERIC(12,2) DEFAULT 0,
  balance_due       NUMERIC(12,2),
  due_date          DATE,

  -- PDF
  pdf_url           TEXT,
  wa_sent_at        TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, invoice_number)
);

-- ── 15. INVOICE ITEMS ─────────────────────────────────────
CREATE TABLE invoice_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id),
  sort_order      INTEGER DEFAULT 0,
  description     TEXT NOT NULL,
  hsn_code        TEXT DEFAULT '7610',
  width_mm        NUMERIC(10,2),
  height_mm       NUMERIC(10,2),
  unit_area_sqft  NUMERIC(10,4),
  total_area_sqft NUMERIC(10,4),
  quantity        INTEGER DEFAULT 1,
  rate            NUMERIC(10,2),
  value           NUMERIC(12,2),
  total_amount    NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 16. RECEIPTS ──────────────────────────────────────────
CREATE TABLE receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  invoice_id      UUID REFERENCES invoices(id),
  pi_id           UUID REFERENCES proforma_invoices(id),
  created_by      UUID REFERENCES users(id),

  receipt_number  TEXT NOT NULL,     -- e.g. "REC-2025-008"
  date            DATE DEFAULT CURRENT_DATE,
  amount          NUMERIC(12,2) NOT NULL,
  payment_mode    payment_mode DEFAULT 'cash',
  transaction_ref TEXT,             -- UTR / cheque no / transaction ID
  notes           TEXT,

  -- Client snapshot
  client_name     TEXT NOT NULL,
  client_phone    TEXT,

  pdf_url         TEXT,
  wa_sent_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, receipt_number)
);

-- ── 17. PAYMENTS (detailed tracker) ───────────────────────
CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  invoice_id      UUID REFERENCES invoices(id),
  pi_id           UUID REFERENCES proforma_invoices(id),
  receipt_id      UUID REFERENCES receipts(id),

  amount          NUMERIC(12,2) NOT NULL,
  payment_mode    payment_mode DEFAULT 'cash',
  transaction_ref TEXT,
  payment_date    DATE DEFAULT CURRENT_DATE,
  notes           TEXT,

  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORKSHOP TABLES
-- ============================================================

-- ── 18. CUTTING LISTS ─────────────────────────────────────
CREATE TABLE cutting_lists (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_id        UUID REFERENCES quotes(id) ON DELETE CASCADE,
  quote_item_id   UUID REFERENCES quote_items(id),
  created_by      UUID REFERENCES users(id),

  -- Profile details
  profile_id      UUID REFERENCES profiles(id),
  profile_code    TEXT,
  profile_name    TEXT,
  colour          TEXT,

  -- Cut details
  cut_length_mm   NUMERIC(10,2) NOT NULL,
  angle           NUMERIC(5,2) DEFAULT 90,  -- 45 or 90
  quantity        INTEGER DEFAULT 1,
  label           TEXT,              -- e.g. "Frame Top", "Sash Side"

  -- Status
  status          cutting_status DEFAULT 'pending',
  cut_at          TIMESTAMPTZ,
  cut_by          UUID REFERENCES users(id),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CRM TABLES
-- ============================================================

-- ── 19. LEADS ─────────────────────────────────────────────
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  assigned_to     UUID REFERENCES users(id),
  created_by      UUID REFERENCES users(id),

  -- Lead info
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  source          TEXT,              -- WhatsApp, referral, indiamart, etc.
  status          lead_status DEFAULT 'new',
  value_estimate  NUMERIC(12,2),

  -- Follow-up
  follow_up_date  DATE,
  follow_up_note  TEXT,

  -- Notes
  notes           TEXT,

  won_at          TIMESTAMPTZ,
  lost_at         TIMESTAMPTZ,
  lost_reason     TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 20. ACTIVITIES (Timeline per client/lead) ─────────────
CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  lead_id         UUID REFERENCES leads(id),
  created_by      UUID REFERENCES users(id),

  type            TEXT NOT NULL,     -- call, visit, whatsapp, email, quote_sent, payment
  title           TEXT,
  description     TEXT,
  outcome         TEXT,
  next_action     TEXT,
  next_action_date DATE,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 21. SITE VISITS ───────────────────────────────────────
CREATE TABLE site_visits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  lead_id         UUID REFERENCES leads(id),
  assigned_to     UUID REFERENCES users(id),

  scheduled_at    TIMESTAMPTZ NOT NULL,
  address         TEXT,
  notes           TEXT,
  completed       BOOLEAN DEFAULT false,
  completed_at    TIMESTAMPTZ,
  outcome         TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS & SYSTEM
-- ============================================================

-- ── 22. NOTIFICATIONS ─────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),

  type            notification_type NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,
  is_read         BOOLEAN DEFAULT false,
  read_at         TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 23. WHATSAPP MESSAGES ─────────────────────────────────
CREATE TABLE whatsapp_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  quote_id        UUID REFERENCES quotes(id),
  invoice_id      UUID REFERENCES invoices(id),
  pi_id           UUID REFERENCES proforma_invoices(id),
  receipt_id      UUID REFERENCES receipts(id),

  to_phone        TEXT NOT NULL,
  message_type    TEXT,              -- quote, invoice, receipt, reminder
  wa_message_id   TEXT,
  status          TEXT DEFAULT 'pending', -- pending, sent, delivered, read, failed
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  read_at         TIMESTAMPTZ,
  failed_reason   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 24. AI SUGGESTIONS ────────────────────────────────────
CREATE TABLE ai_suggestions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  quote_id        UUID REFERENCES quotes(id),
  client_id       UUID REFERENCES clients(id),

  type            TEXT NOT NULL,     -- price_suggestion, follow_up, error_detect
  title           TEXT,
  body            TEXT,
  suggested_value NUMERIC(12,2),
  is_accepted     BOOLEAN,
  accepted_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 25. AUDIT LOG ─────────────────────────────────────────
CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id),
  user_id         UUID REFERENCES users(id),

  table_name      TEXT NOT NULL,
  record_id       UUID,
  action          TEXT NOT NULL,     -- INSERT, UPDATE, DELETE
  old_data        JSONB,
  new_data        JSONB,
  ip_address      TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 26. SUBSCRIPTIONS ─────────────────────────────────────
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  plan            plan_type NOT NULL,
  status          TEXT DEFAULT 'active',  -- active, cancelled, expired
  razorpay_sub_id TEXT,
  razorpay_plan_id TEXT,
  amount          NUMERIC(10,2),
  currency        TEXT DEFAULT 'INR',
  billing_cycle   TEXT DEFAULT 'monthly',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (Performance)
-- ============================================================

-- Companies
CREATE INDEX idx_companies_plan ON companies(plan);

-- Users
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- Clients
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_tag ON clients(tag);

-- Quotes
CREATE INDEX idx_quotes_company ON quotes(company_id);
CREATE INDEX idx_quotes_client ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX idx_quotes_number ON quotes(company_id, quote_number);

-- Quote items
CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX idx_quote_items_company ON quote_items(company_id);

-- Proforma
CREATE INDEX idx_pi_company ON proforma_invoices(company_id);
CREATE INDEX idx_pi_client ON proforma_invoices(client_id);
CREATE INDEX idx_pi_status ON proforma_invoices(status);

-- Invoices
CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);

-- Payments
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_client ON payments(client_id);
CREATE INDEX idx_payments_date ON payments(payment_date DESC);

-- Cutting lists
CREATE INDEX idx_cutting_quote ON cutting_lists(quote_id);
CREATE INDEX idx_cutting_status ON cutting_lists(status);

-- Profiles
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_profiles_system ON profiles(system);

-- Glass
CREATE INDEX idx_glass_company ON glass_types(company_id);

-- Accessories
CREATE INDEX idx_acc_company ON accessories(company_id);
CREATE INDEX idx_acc_type ON accessories(type);

-- Leads
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_followup ON leads(follow_up_date);

-- Notifications
CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(is_read);
CREATE INDEX idx_notif_created ON notifications(created_at DESC);

-- WhatsApp
CREATE INDEX idx_wa_company ON whatsapp_messages(company_id);
CREATE INDEX idx_wa_status ON whatsapp_messages(status);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pi_updated_at
  BEFORE UPDATE ON proforma_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_count INTEGER;
  v_number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM quotes
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  v_number := 'Q-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate PI number
CREATE OR REPLACE FUNCTION generate_pi_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM proforma_invoices
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'PI-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate Invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate Receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM receipts
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'REC-' || v_year || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Update client totals when quote is updated
CREATE OR REPLACE FUNCTION update_client_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clients SET
    total_quotes = (
      SELECT COUNT(*) FROM quotes
      WHERE client_id = NEW.client_id AND company_id = NEW.company_id
    ),
    total_billed = (
      SELECT COALESCE(SUM(grand_total), 0) FROM invoices
      WHERE client_id = NEW.client_id AND company_id = NEW.company_id
        AND status != 'cancelled'
    ),
    total_paid = (
      SELECT COALESCE(SUM(amount), 0) FROM payments
      WHERE client_id = NEW.client_id AND company_id = NEW.company_id
    ),
    updated_at = NOW()
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_client_on_quote
  AFTER INSERT OR UPDATE ON quotes
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION update_client_totals();

CREATE TRIGGER trg_update_client_on_payment
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.client_id IS NOT NULL)
  EXECUTE FUNCTION update_client_totals();

-- Update invoice balance_due and status
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
  v_paid  NUMERIC;
BEGIN
  SELECT grand_total INTO v_total FROM invoices WHERE id = NEW.invoice_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments WHERE invoice_id = NEW.invoice_id;

  UPDATE invoices SET
    paid_amount = v_paid,
    balance_due = v_total - v_paid,
    status = CASE
      WHEN v_paid >= v_total THEN 'paid'::bill_status
      WHEN v_paid > 0        THEN 'partial'::bill_status
      ELSE 'pending'::bill_status
    END,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_payment_status
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.invoice_id IS NOT NULL)
  EXECUTE FUNCTION update_invoice_payment_status();

-- Mark overdue invoices (run via cron / scheduled function)
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS void AS $$
BEGIN
  UPDATE invoices SET
    status = 'overdue',
    updated_at = NOW()
  WHERE due_date < CURRENT_DATE
    AND status IN ('pending', 'partial')
    AND balance_due > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE companies           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_weight_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE glass_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_headers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_invoices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proforma_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cutting_lists       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- ── RLS POLICIES ──────────────────────────────────────────

-- Companies: users can only see their own company
CREATE POLICY "company_isolation" ON companies
  FOR ALL USING (id = current_company_id());

-- Users: can see all users in same company
CREATE POLICY "users_same_company" ON users
  FOR ALL USING (company_id = current_company_id());

-- Clients
CREATE POLICY "clients_same_company" ON clients
  FOR ALL USING (company_id = current_company_id());

-- Profile Companies
CREATE POLICY "profile_companies_same_company" ON profile_companies
  FOR ALL USING (company_id = current_company_id());

-- Profiles
CREATE POLICY "profiles_same_company" ON profiles
  FOR ALL USING (company_id = current_company_id());

-- Profile Weight Prices
CREATE POLICY "pwp_same_company" ON profile_weight_prices
  FOR ALL USING (company_id = current_company_id());

-- Glass Types
CREATE POLICY "glass_same_company" ON glass_types
  FOR ALL USING (company_id = current_company_id());

-- Accessories
CREATE POLICY "acc_same_company" ON accessories
  FOR ALL USING (company_id = current_company_id());

-- Quotes
CREATE POLICY "quotes_same_company" ON quotes
  FOR ALL USING (company_id = current_company_id());

-- Workshop role: can only see quotes (not edit)
CREATE POLICY "quotes_workshop_read" ON quotes
  FOR SELECT USING (
    company_id = current_company_id()
    AND (
      current_user_role() != 'workshop'
      OR TRUE  -- workshop can read quotes for cutting lists
    )
  );

-- Quote Items
CREATE POLICY "quote_items_same_company" ON quote_items
  FOR ALL USING (company_id = current_company_id());

-- Letter Headers
CREATE POLICY "lh_same_company" ON letter_headers
  FOR ALL USING (company_id = current_company_id());

-- Proforma Invoices
CREATE POLICY "pi_same_company" ON proforma_invoices
  FOR ALL USING (company_id = current_company_id());

-- Proforma Items
CREATE POLICY "pi_items_same_company" ON proforma_items
  FOR ALL USING (company_id = current_company_id());

-- Invoices: accounts + owner can access, sales can view only
CREATE POLICY "invoices_same_company" ON invoices
  FOR ALL USING (company_id = current_company_id());

-- Invoice Items
CREATE POLICY "inv_items_same_company" ON invoice_items
  FOR ALL USING (company_id = current_company_id());

-- Receipts
CREATE POLICY "receipts_same_company" ON receipts
  FOR ALL USING (company_id = current_company_id());

-- Payments
CREATE POLICY "payments_same_company" ON payments
  FOR ALL USING (company_id = current_company_id());

-- Cutting Lists: workshop can update status only
CREATE POLICY "cutting_same_company" ON cutting_lists
  FOR ALL USING (company_id = current_company_id());

-- Leads
CREATE POLICY "leads_same_company" ON leads
  FOR ALL USING (company_id = current_company_id());

-- Activities
CREATE POLICY "activities_same_company" ON activities
  FOR ALL USING (company_id = current_company_id());

-- Site Visits
CREATE POLICY "visits_same_company" ON site_visits
  FOR ALL USING (company_id = current_company_id());

-- Notifications: each user sees their own
CREATE POLICY "notif_own" ON notifications
  FOR ALL USING (
    company_id = current_company_id()
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- WhatsApp messages
CREATE POLICY "wa_same_company" ON whatsapp_messages
  FOR ALL USING (company_id = current_company_id());

-- AI suggestions
CREATE POLICY "ai_same_company" ON ai_suggestions
  FOR ALL USING (company_id = current_company_id());

-- Subscriptions
CREATE POLICY "sub_same_company" ON subscriptions
  FOR ALL USING (company_id = current_company_id());

-- ============================================================
-- SEED DATA — Demo company & sample data
-- ============================================================

DO $$
DECLARE
  v_company_id    UUID := uuid_generate_v4();
  v_profile_co_id UUID := uuid_generate_v4();
  v_client1_id    UUID := uuid_generate_v4();
  v_client2_id    UUID := uuid_generate_v4();
  v_client3_id    UUID := uuid_generate_v4();
BEGIN

-- Demo Company
INSERT INTO companies (id, name, owner_name, phone, email, address, city, state, gst_number, plan)
VALUES (
  v_company_id,
  'Kumar Aluminium Works',
  'Rajesh Kumar',
  '+91 98765 43210',
  'rajesh@kumaraluminium.com',
  '12, Industrial Area, Phase 2',
  'Bengaluru',
  'Karnataka',
  '29ABCDE1234F1Z5',
  'trial'
);

-- Profile company (SBPL)
INSERT INTO profile_companies (id, company_id, name, code)
VALUES (v_profile_co_id, v_company_id, 'SBPL', 'SBPL');

-- Profile weight prices
INSERT INTO profile_weight_prices (company_id, profile_company_id, colour, price_per_kg)
VALUES
  (v_company_id, v_profile_co_id, 'white',      128),
  (v_company_id, v_profile_co_id, 'grey',        0),
  (v_company_id, v_profile_co_id, 'black',       0),
  (v_company_id, v_profile_co_id, 'walnut',      0),
  (v_company_id, v_profile_co_id, 'golden_oak',  0);

-- Sample Profiles
INSERT INTO profiles (company_id, profile_company_id, profile_code, profile_name, brand, system, price_per_kg)
VALUES
  (v_company_id, v_profile_co_id, 'SB-BP01_white', 'Baypole',               'SBPL', 'sliding',  128),
  (v_company_id, v_profile_co_id, 'SB-D1_black',   '30 MM D. Strip',        'SBPL', 'sliding',  0),
  (v_company_id, v_profile_co_id, 'SB-CLP_black',  'Blind Louver',          'SBPL', 'casement', 95),
  (v_company_id, v_profile_co_id, '107_black',      'Interlock',             'SBPL', 'sliding',  112),
  (v_company_id, v_profile_co_id, '106_black',      'Single Glazing Bead',   'SBPL', 'sliding',  0),
  (v_company_id, v_profile_co_id, '105_black',      'Sliding Mullion',       'SBPL', 'sliding',  0),
  (v_company_id, v_profile_co_id, '104_black',      'Sliding Door Sash',     'SBPL', 'door',     0),
  (v_company_id, v_profile_co_id, '103_black',      'Sliding Window Sash',   'SBPL', 'sliding',  0),
  (v_company_id, v_profile_co_id, 'ECO_102_black',  '3 Track',               'SBPL', 'sliding',  0),
  (v_company_id, v_profile_co_id, '101_black',      '2 Track',               'SBPL', 'sliding',  0);

-- Sample Glass Types
INSERT INTO glass_types (company_id, name, thickness_mm, glass_type, price_per_sqft)
VALUES
  (v_company_id, '5MM Clear Toughened Glass',    5,  'clear',    85),
  (v_company_id, '8MM Clear Toughened Glass',    8,  'clear',    50),
  (v_company_id, '5+10MM Argon Gas+5T',          20, 'dgu',      180),
  (v_company_id, '5MM Frosted Glass',            5,  'frosted',  80),
  (v_company_id, '5mm Frosted Toughened',        5,  'frosted',  120),
  (v_company_id, '6mm Clear Toughened Glass',    6,  'clear',    110),
  (v_company_id, '5mm Brown Tinted Toughened',   5,  'tinted',   130),
  (v_company_id, '12mm Clear Toughened Glass',   12, 'clear',    120),
  (v_company_id, '5MM Acid Wash Toughened',      5,  'frosted',  50),
  (v_company_id, '5mm Plain Glass',              5,  'clear',    130),
  (v_company_id, 'NO GLASS',                     0,  'none',     0),
  (v_company_id, '5mm Laminated Glass',          5,  'laminated',420);

-- Sample Accessories
INSERT INTO accessories (company_id, type, name, code, price)
VALUES
  (v_company_id, 'handle', 'D-Dummy Sliding Handle',      NULL,     70),
  (v_company_id, 'handle', 'C-Type Sliding Handle',       NULL,     60),
  (v_company_id, 'handle', 'Touch Lock Handle',           NULL,     70),
  (v_company_id, 'roller', 'Single Roller',               NULL,     10),
  (v_company_id, 'handle', 'Shortneck L Handle',          NULL,    180),
  (v_company_id, 'hinge',  'Door Hinge',                  NULL,     60),
  (v_company_id, 'hinge',  'Window Hinges',               'hing001',70),
  (v_company_id, 'roller', 'Double Wheel With Groove',    'dwwoo1', 50),
  (v_company_id, 'handle', 'D Handle With Key',           'dhk',   333),
  (v_company_id, 'handle', 'Casement Door Handle with Key','cdky', 120),
  (v_company_id, 'handle', 'Cosker Handle',               'ch001', 110),
  (v_company_id, 'handle', 'Crescent Handle',             'ch001', 110),
  (v_company_id, 'handle', 'Bathroom Door Handle',        'bdh001',100),
  (v_company_id, 'hinge',  '3D Hinges',                   '3',     200),
  (v_company_id, 'hinge',  'Flat Hinge',                  'fh001', 100),
  (v_company_id, 'hinge',  'Concealed Hinge',             'cd001', 100),
  (v_company_id, 'hinge',  'Butt Hinge',                  NULL,    112);

-- Sample Clients
INSERT INTO clients (id, company_id, name, phone, email, address, city, tag)
VALUES
  (v_client1_id, v_company_id, 'Sharma Builders',    '+91 98765 43210', 'sharma@builders.com',  'Koramangala',          'Bengaluru', 'builder'),
  (v_client2_id, v_company_id, 'Mehta Residence',    '+91 76543 21098', 'mehta@gmail.com',       'Whitefield',           'Bengaluru', 'individual'),
  (v_client3_id, v_company_id, 'Reddy Constructions','+91 54321 09876', 'reddy@constructions.in','Banjara Hills',        'Hyderabad', 'builder');

END $$;

-- ============================================================
-- VIEWS (Convenience queries)
-- ============================================================

-- Outstanding invoices view
CREATE OR REPLACE VIEW v_outstanding_invoices AS
SELECT
  i.id,
  i.company_id,
  i.invoice_number,
  i.client_name,
  i.client_phone,
  i.grand_total,
  i.paid_amount,
  i.balance_due,
  i.due_date,
  i.status,
  CURRENT_DATE - i.due_date AS days_overdue,
  c.tag AS client_tag
FROM invoices i
LEFT JOIN clients c ON c.id = i.client_id
WHERE i.status IN ('pending', 'partial', 'overdue')
  AND i.balance_due > 0;

-- Quote conversion funnel view
CREATE OR REPLACE VIEW v_quote_funnel AS
SELECT
  company_id,
  COUNT(*) FILTER (WHERE status = 'draft')    AS draft_count,
  COUNT(*) FILTER (WHERE status = 'sent')     AS sent_count,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE status = 'expired')  AS expired_count,
  COUNT(*)                                     AS total_count,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'approved')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('sent','approved','rejected')), 0) * 100,
    1
  ) AS win_rate_pct
FROM quotes
GROUP BY company_id;

-- Monthly revenue view
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
  company_id,
  DATE_TRUNC('month', date) AS month,
  COUNT(*) AS invoice_count,
  SUM(grand_total) AS total_billed,
  SUM(paid_amount) AS total_collected,
  SUM(balance_due) AS total_outstanding
FROM invoices
WHERE status != 'cancelled'
GROUP BY company_id, DATE_TRUNC('month', date)
ORDER BY month DESC;

-- Client summary view
CREATE OR REPLACE VIEW v_client_summary AS
SELECT
  c.id,
  c.company_id,
  c.name,
  c.phone,
  c.tag,
  c.total_quotes,
  c.total_billed,
  c.total_paid,
  c.total_billed - c.total_paid AS outstanding,
  MAX(q.created_at) AS last_quote_at,
  MAX(p.payment_date) AS last_payment_at
FROM clients c
LEFT JOIN quotes q ON q.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id
GROUP BY c.id, c.company_id, c.name, c.phone, c.tag,
         c.total_quotes, c.total_billed, c.total_paid;

-- ============================================================
-- STORAGE BUCKETS (Run in Supabase Dashboard > Storage)
-- ============================================================

-- NOTE: Run these via Supabase Storage API or Dashboard
-- insert into storage.buckets (id, name, public)
-- values ('company-logos', 'company-logos', true);
--
-- insert into storage.buckets (id, name, public)
-- values ('quote-pdfs', 'quote-pdfs', false);
--
-- insert into storage.buckets (id, name, public)
-- values ('invoice-pdfs', 'invoice-pdfs', false);
--
-- insert into storage.buckets (id, name, public)
-- values ('accessory-photos', 'accessory-photos', true);

-- ============================================================
-- PLAN LIMITS (Enforced via Edge Functions)
-- ============================================================

-- Trial:    5 quotes, 5 invoices, 1 user
-- Starter:  50 quotes/month, unlimited invoices, 1 user
-- Growth:   unlimited quotes, 5 users, all AI features
-- Pro:      unlimited everything, 15 users
-- Enterprise: custom

-- Check limits function (call from Edge Function before insert)
CREATE OR REPLACE FUNCTION check_plan_limit(
  p_company_id UUID,
  p_resource TEXT  -- 'quote', 'invoice', 'user'
) RETURNS BOOLEAN AS $$
DECLARE
  v_plan    plan_type;
  v_count   INTEGER;
BEGIN
  SELECT plan INTO v_plan FROM companies WHERE id = p_company_id;

  IF p_resource = 'quote' AND v_plan = 'trial' THEN
    SELECT COUNT(*) INTO v_count FROM quotes WHERE company_id = p_company_id;
    RETURN v_count < 5;
  END IF;

  IF p_resource = 'invoice' AND v_plan = 'trial' THEN
    SELECT COUNT(*) INTO v_count FROM invoices WHERE company_id = p_company_id;
    RETURN v_count < 5;
  END IF;

  IF p_resource = 'user' AND v_plan = 'starter' THEN
    SELECT COUNT(*) INTO v_count FROM users WHERE company_id = p_company_id AND is_active = true;
    RETURN v_count < 1;
  END IF;

  -- Growth and above: generous limits
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SCHEMA COMPLETE
-- ============================================================
-- Tables:      26
-- Indexes:     30+
-- Triggers:    8
-- Functions:   10
-- RLS Policies: 26
-- Views:        4
-- Enums:        13
-- ============================================================
