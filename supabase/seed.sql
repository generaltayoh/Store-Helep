-- ============================================================================
-- STORE HELEP — SUPABASE DATABASE SEED DATA
-- Default seed dataset for Mama General Store, ~150 products, records, and scans
-- ============================================================================

-- Fix IDs for easy referencing
DO $$
DECLARE
    biz_id UUID := 'a0000000-0000-0000-0000-000000000001';
    scan_saved_id UUID := 'b0000000-0000-0000-0000-000000000001';
    scan_review_id UUID := 'b0000000-0000-0000-0000-000000000002';
    prod_cc UUID := 'c0000000-0000-0000-0000-000000000001';
    prod_pm UUID := 'c0000000-0000-0000-0000-000000000002';
    prod_mg UUID := 'c0000000-0000-0000-0000-000000000003';
    prod_rb UUID := 'c0000000-0000-0000-0000-000000000004';
    prod_bs UUID := 'c0000000-0000-0000-0000-000000000005';
    prod_cb UUID := 'c0000000-0000-0000-0000-000000000006';
    curr_prod_id UUID;
    cat_name TEXT;
    generic_names TEXT[] := ARRAY[
        'Pure Water 1.5L', 'Fanta Orange', 'Sprite 50Cl', 'Bread Toast', 'Sugar 1kg',
        'Salt 500g', 'Tomato Paste', 'Oil 1L', 'Soap Daia', 'Toothpaste',
        'Biscuit Civet', 'Chocolate Bar', 'Juice Vitalo', 'Tea Lipton', 'Coffee Nescafe',
        'Millet Flour', 'Cassava Flour', 'Beans 1kg', 'Onions 1kg', 'Pepper 500g',
        'Indomie Pack', 'Golden Morn', 'Cornflakes', 'Milo Sachet', 'Bournvita',
        'Detergent', 'Disposable Cup', 'Plastic Plate', 'Sponge', 'Broom'
    ];
    categories TEXT[] := ARRAY[
        'Drinks', 'Groceries', 'Bakery', 'Household', 'Snacks', 'Personal Care'
    ];
    i INTEGER;
    d INTEGER;
    day_rec_count INTEGER;
    rec_qty NUMERIC;
    rec_price NUMERIC;
    rec_amt NUMERIC;
    rec_time TIMESTAMPTZ;
BEGIN
    -- 1. Insert Business
    INSERT INTO businesses (id, name, email, type, currency, location, record_method, created_at, updated_at)
    VALUES (
        biz_id,
        'Mama General Store',
        'mamageneral@store.com',
        'Grocery / Mini-market',
        'FCFA',
        'Molyko, Buea',
        'Notebook',
        timezone('utc'::text, now() - INTERVAL '40 days'),
        timezone('utc'::text, now())
    ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        type = EXCLUDED.type,
        currency = EXCLUDED.currency,
        location = EXCLUDED.location;

    -- 2. Insert Business Settings
    INSERT INTO business_settings (business_id, language, dark_mode, created_at, updated_at)
    VALUES (biz_id, 'en', false, timezone('utc'::text, now() - INTERVAL '40 days'), timezone('utc'::text, now()))
    ON CONFLICT (business_id) DO UPDATE SET
        language = EXCLUDED.language,
        dark_mode = EXCLUDED.dark_mode;

    -- 3. Insert Core Named Products
    INSERT INTO products (id, business_id, sku, name, category, unit_price, stock_qty, created_at, updated_at)
    VALUES
        (prod_cc, biz_id, 'CC-50', 'Coca-Cola 50Cl', 'Drinks', 500, 34, now() - INTERVAL '35 days', now()),
        (prod_pm, biz_id, 'PM-01', 'Peak Milk Tin', 'Groceries', 900, 4, now() - INTERVAL '35 days', now()),
        (prod_mg, biz_id, 'MG-12', 'Maggi Cube Pack', 'Groceries', 1200, 0, now() - INTERVAL '35 days', now()),
        (prod_rb, biz_id, 'RB-25', 'Rice bag 25kg', 'Groceries', 16000, 18, now() - INTERVAL '35 days', now()),
        (prod_bs, biz_id, 'BS-10', 'Blue Band Sachet', 'Bakery', 300, 22, now() - INTERVAL '35 days', now()),
        (prod_cb, biz_id, 'CB-05', 'Candle Box', 'Household', 750, 3, now() - INTERVAL '35 days', now())
    ON CONFLICT (business_id, sku) DO NOTHING;

    -- 4. Generate ~145 Additional Products to Reach 150+ Catalog
    FOR i IN 7..150 LOOP
        cat_name := categories[((i - 1) % array_length(categories, 1)) + 1];
        INSERT INTO products (business_id, sku, name, category, unit_price, stock_qty, created_at, updated_at)
        VALUES (
            biz_id,
            'GN-' || LPAD(i::text, 3, '0'),
            generic_names[((i - 1) % array_length(generic_names, 1)) + 1] || ' ' || i,
            cat_name,
            150 + ((i * 37) % 18) * 100,
            i % 11,
            now() - INTERVAL '30 days',
            now()
        ) ON CONFLICT (business_id, sku) DO NOTHING;
    END LOOP;

    -- 5. Insert Scans
    INSERT INTO scans (id, business_id, file_name, image_url, status, created_at, updated_at)
    VALUES
        (scan_saved_id, biz_id, 'page-14-aug.jpg', null, 'saved', now() - INTERVAL '13 days', now() - INTERVAL '13 days'),
        (scan_review_id, biz_id, 'page-15-aug.jpg', null, 'needs_review', now() - INTERVAL '12 days', now() - INTERVAL '12 days')
    ON CONFLICT (id) DO NOTHING;

    -- 6. Insert Scan Extracted Items
    INSERT INTO scan_extracted_items (scan_id, product_name, quantity, unit_price, date, confidence, created_at)
    VALUES
        (scan_saved_id, 'Coca-Cola 50Cl', 5, 500, now() - INTERVAL '13 days', 0.94, now() - INTERVAL '13 days'),
        (scan_saved_id, 'Fanta Orange', 3, 450, now() - INTERVAL '13 days', 0.88, now() - INTERVAL '13 days'),
        (scan_review_id, 'Peak Milk Tin', 2, 900, now() - INTERVAL '12 days', 0.91, now() - INTERVAL '12 days'),
        (scan_review_id, 'Unknown item', 1, 0, now() - INTERVAL '12 days', 0.42, now() - INTERVAL '12 days'),
        (scan_review_id, 'Rice bag 25kg', 1, 16000, now() - INTERVAL '12 days', 0.97, now() - INTERVAL '12 days')
    ON CONFLICT DO NOTHING;

    -- 7. Insert Records for Today
    FOR i IN 1..5 LOOP
        INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, amount, timestamp, source, status, scan_id)
        VALUES (
            biz_id, prod_cc, 'Coca-Cola 50Cl', 5, 500, 2500,
            date_trunc('day', now()) + ((8 + i) * INTERVAL '1 hour') + (14 * INTERVAL '1 minute'),
            'scanned', 'saved', scan_saved_id
        );
    END LOOP;

    INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, amount, timestamp, source, status)
    VALUES (
        biz_id, prod_rb, 'Rice bag 25kg', 1, 16000, 16000,
        date_trunc('day', now()) + INTERVAL '8 hours 52 minutes',
        'manual', 'saved'
    );

    -- 8. Insert Records for Yesterday
    INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, amount, timestamp, source, status)
    VALUES (
        biz_id, prod_bs, 'Blue Band Sachet', 12, 300, 3600,
        date_trunc('day', now() - INTERVAL '1 day') + INTERVAL '16 hours 20 minutes',
        'scanned', 'saved'
    );

    FOR i IN 1..3 LOOP
        INSERT INTO records (business_id, product_id, product_name, quantity, unit_price, amount, timestamp, source, status)
        VALUES (
            biz_id, prod_cc, 'Coca-Cola 50Cl', 3, 500, 1500,
            date_trunc('day', now() - INTERVAL '1 day') + ((10 + i) * INTERVAL '1 hour') + (5 * INTERVAL '1 minute'),
            'scanned', 'saved'
        );
    END LOOP;

    -- 9. Insert Multi-Day Records Across Previous 29 Days (for Analytics)
    FOR d IN 2..29 LOOP
        day_rec_count := (d % 4) + 1;
        FOR i IN 1..day_rec_count LOOP
            rec_qty := (i % 3) + 1;
            rec_price := 500 + ((d * 13 + i * 7) % 15) * 200;
            rec_amt := rec_qty * rec_price;
            rec_time := date_trunc('day', now() - (d * INTERVAL '1 day')) + ((9 + i) * INTERVAL '1 hour') + (10 * INTERVAL '1 minute');

            INSERT INTO records (business_id, product_name, quantity, unit_price, amount, timestamp, source, status)
            VALUES (
                biz_id,
                generic_names[((d * 7 + i * 3) % array_length(generic_names, 1)) + 1],
                rec_qty,
                rec_price,
                rec_amt,
                rec_time,
                CASE WHEN d % 5 = 0 THEN 'manual' ELSE 'scanned' END,
                CASE WHEN d % 9 = 0 THEN 'needs_review' ELSE 'saved' END
            );
        END LOOP;
    END LOOP;

END $$;
