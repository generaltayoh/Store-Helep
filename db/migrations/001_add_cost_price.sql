-- ============================================================================
-- STORE HELEP — MIGRATION 001
-- Estimated profit is now computed as (selling price - cost price) x quantity.
--
-- products.cost_price : what the store paid for one unit of the product.
-- records.cost_price  : snapshot of the product's cost price at the moment of
--                        the sale, so editing a product later never rewrites
--                        the profit of past sales.
--
-- Run against the existing Neon database (safe to run more than once).
-- ============================================================================

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE records
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_cost_price_check'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT products_cost_price_check CHECK (cost_price >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'records_cost_price_check'
    ) THEN
        ALTER TABLE records
            ADD CONSTRAINT records_cost_price_check CHECK (cost_price >= 0);
    END IF;
END $$;
