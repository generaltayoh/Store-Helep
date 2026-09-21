-- ============================================================================
-- STORE HELEP — SUPABASE DATABASE SCHEMA
-- PostgreSQL schema for turning paper records into digital business records
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Clean existing tables (if re-running schema)
-- ============================================================================
DROP TABLE IF EXISTS scan_extracted_items CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- ============================================================================
-- 3. Businesses Table
-- ============================================================================
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Grocery / Mini-market',
    currency TEXT NOT NULL DEFAULT 'FCFA',
    location TEXT DEFAULT '',
    record_method TEXT DEFAULT 'Notebook',
    token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for searching businesses by email
CREATE INDEX idx_businesses_email ON businesses(email);

-- ============================================================================
-- 4. Business Settings Table
-- ============================================================================
CREATE TABLE business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'en',
    dark_mode BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_business_settings_business_id UNIQUE (business_id)
);

CREATE INDEX idx_business_settings_business_id ON business_settings(business_id);

-- ============================================================================
-- 5. Products Table (Inventory & Catalog)
-- ============================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_products_business_sku UNIQUE (business_id, sku)
);

CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_stock_qty ON products(stock_qty);

-- ============================================================================
-- 6. Scans Table (Uploaded receipt / sales notebook photos)
-- ============================================================================
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'saved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_scans_business_id ON scans(business_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);

-- ============================================================================
-- 7. Scan Extracted Items Table (OCR-extracted line items awaiting review)
-- ============================================================================
CREATE TABLE scan_extracted_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.90 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_scan_extracted_items_scan_id ON scan_extracted_items(scan_id);

-- ============================================================================
-- 8. Records Table (Confirmed Business Sales & Transactions)
-- ============================================================================
CREATE TABLE records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('scanned', 'manual')),
    status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'needs_review')),
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_records_business_id ON records(business_id);
CREATE INDEX idx_records_product_id ON records(product_id);
CREATE INDEX idx_records_timestamp ON records(timestamp DESC);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_source ON records(source);
CREATE INDEX idx_records_scan_id ON records(scan_id);

-- ============================================================================
-- 9. Automatic updated_at Trigger Function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_business_settings_updated_at
    BEFORE UPDATE ON business_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_scans_updated_at
    BEFORE UPDATE ON scans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. Row Level Security (RLS) & Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_extracted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

-- Allow full access to Service Role (for backend server calls)
CREATE POLICY "Service role full access on businesses" ON businesses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on business_settings" ON business_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on scans" ON scans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on scan_extracted_items" ON scan_extracted_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on records" ON records FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow public / anon access for initial client / single-tenant shop usage
CREATE POLICY "Anon full access on businesses" ON businesses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on business_settings" ON business_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on products" ON products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on scans" ON scans FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on scan_extracted_items" ON scan_extracted_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access on records" ON records FOR ALL TO anon USING (true) WITH CHECK (true);

-- Allow authenticated users access
CREATE POLICY "Authenticated full access on businesses" ON businesses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on business_settings" ON business_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on products" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on scans" ON scans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on scan_extracted_items" ON scan_extracted_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access on records" ON records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 11. Storage Bucket for Receipt Scans (Optional Setup)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-scans', 'receipt-scans', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
        DROP POLICY IF EXISTS "Public access to receipt-scans" ON storage.objects;
        CREATE POLICY "Public access to receipt-scans" ON storage.objects
            FOR ALL TO public
            USING (bucket_id = 'receipt-scans')
            WITH CHECK (bucket_id = 'receipt-scans');
    END IF;
END $$;
