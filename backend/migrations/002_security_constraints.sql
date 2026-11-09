-- Apply after 001_initial.sql. Invalid legacy rows abort the transaction; no rows are deleted.
BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.top_products'::regclass AND conname = 'top_products_valid_offer') THEN
        ALTER TABLE public.top_products ADD CONSTRAINT top_products_valid_offer CHECK (
            search_query IS NOT NULL AND length(btrim(search_query)) BETWEEN 1 AND 120
            AND location_key IS NOT NULL AND length(btrim(location_key)) BETWEEN 1 AND 120
            AND platform IS NOT NULL AND length(btrim(platform)) BETWEEN 1 AND 60
            AND name IS NOT NULL AND length(btrim(name)) BETWEEN 1 AND 300
            AND quantity IS NOT NULL AND length(quantity) <= 100
            AND price IS NOT NULL AND price > 0 AND price <= 1000000
            AND (mrp IS NULL OR (mrp >= 0 AND mrp <= 1000000))
            AND created_at IS NOT NULL
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.canonical_products'::regclass AND conname = 'canonical_products_valid_name') THEN
        ALTER TABLE public.canonical_products ADD CONSTRAINT canonical_products_valid_name CHECK (
            name IS NOT NULL AND length(btrim(name)) BETWEEN 1 AND 120
            AND (category IS NULL OR length(category) <= 200)
        );
    END IF;
END $$;
COMMIT;
