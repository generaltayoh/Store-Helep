-- ============================================================================
-- STORE HELEP — POSTGRESQL (NEON) DATABASE SCHEMA
-- PostgreSQL schema for turning paper records into digital business records
--
-- Usage: paste this file into the Neon SQL Editor (or run with psql) against
-- your Neon database. gen_random_uuid() is built into PostgreSQL 13+, so no
-- extensions are required.
-- ============================================================================

-- ============================================================================
-- 1. Clean existing tables (if re-running schema)
-- ============================================================================
DROP TABLE IF EXISTS scan_extracted_items CASCADE;
DROP TABLE IF EXISTS records CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS business_settings CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- ============================================================================
-- 2. Businesses Table
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

CREATE INDEX idx_businesses_email ON businesses(email);

-- ============================================================================
-- 3. Business Settings Table
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
-- 4. Products Table (Inventory & Catalog)
-- ============================================================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_products_business_id ON products(business_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_stock_qty ON products(stock_qty);

-- ============================================================================
-- 5. Scans Table (Uploaded receipt / sales notebook photos)
-- ============================================================================
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'needs_review' CHECK (status IN ('needs_review', 'saved')),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_scans_business_id ON scans(business_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);

-- ============================================================================
-- 6. Scan Extracted Items Table (OCR-extracted line items awaiting review)
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
-- 7. Records Table (Confirmed Business Sales & Transactions)
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
-- 8. Automatic updated_at Trigger Function
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
