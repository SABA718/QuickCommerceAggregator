-- DealDock's runtime schema. Apply using psql -v ON_ERROR_STOP=1 or Supabase SQL editor.
-- Transactional and repeatable. A conflicting legacy schema/data aborts rather than deleting data.
BEGIN;

CREATE TABLE IF NOT EXISTS public.canonical_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    category text CHECK (category IS NULL OR length(category) <= 200),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.top_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    search_query text NOT NULL CHECK (length(search_query) BETWEEN 1 AND 120),
    location_key text NOT NULL DEFAULT 'default',
    platform text NOT NULL CHECK (length(platform) BETWEEN 1 AND 60),
    name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 300),
    price numeric(12, 2) NOT NULL CHECK (price > 0),
    mrp numeric(12, 2) CHECK (mrp IS NULL OR mrp >= 0),
    image_url text NOT NULL DEFAULT '',
    time text NOT NULL DEFAULT '',
    link text NOT NULL DEFAULT '',
    quantity text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- The old scaffold's manually provisioned table may lack location_key.
-- 'default' means the provider's configured region, never the user's postcode.
ALTER TABLE public.top_products ADD COLUMN IF NOT EXISTS location_key text NOT NULL DEFAULT 'default';

CREATE UNIQUE INDEX IF NOT EXISTS canonical_products_name_key
    ON public.canonical_products (name);
CREATE UNIQUE INDEX IF NOT EXISTS top_products_offer_identity
    ON public.top_products (search_query, location_key, platform, name, quantity);
CREATE INDEX IF NOT EXISTS top_products_search_freshness
    ON public.top_products (search_query, location_key, created_at DESC);
CREATE INDEX IF NOT EXISTS top_products_expiry
    ON public.top_products (created_at);

-- Only trusted server clients using Supabase's service_role may access these tables.
-- No public policies are created; browser clients must call the Express gateway.
ALTER TABLE public.canonical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.top_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.canonical_products, public.top_products FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON public.canonical_products, public.top_products FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON public.canonical_products, public.top_products FROM authenticated;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT USAGE ON SCHEMA public TO service_role;
        GRANT SELECT, INSERT, UPDATE, DELETE ON public.canonical_products, public.top_products TO service_role;
    END IF;
END $$;

COMMIT;
