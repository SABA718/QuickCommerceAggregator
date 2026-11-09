-- CI only: exercise schema invariants and RLS on a disposable PostgreSQL database.
-- All test rows and the temporary role are rolled back.
BEGIN;
CREATE ROLE dealdock_migration_test_user;
GRANT USAGE ON SCHEMA public TO dealdock_migration_test_user;
GRANT SELECT ON public.top_products, public.canonical_products TO dealdock_migration_test_user;

INSERT INTO public.canonical_products (name, category) VALUES ('migration test milk', 'Dairy');
INSERT INTO public.top_products (search_query, platform, name, price, quantity)
VALUES ('migration test milk', 'Blinkit', 'Migration test milk', 42.50, '500ml');

DO $$
BEGIN
    BEGIN
        INSERT INTO public.top_products (search_query, platform, name, price)
        VALUES ('nan price', 'Blinkit', 'NaN price', 'NaN');
        RAISE EXCEPTION 'NaN price was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.top_products (search_query, platform, name, price)
        VALUES ('   ', 'Blinkit', 'Blank query', 42);
        RAISE EXCEPTION 'Blank query was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.top_products (search_query, platform, name, price, quantity)
        VALUES ('migration test milk', 'Blinkit', 'Migration test milk', 40, '500ml');
        RAISE EXCEPTION 'Duplicate offer identity was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.top_products (search_query, platform, name, price)
        VALUES ('invalid price', 'Blinkit', 'Invalid price', -1);
        RAISE EXCEPTION 'Negative price was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.top_products (search_query, platform, name, price)
        VALUES ('missing price', 'Blinkit', 'Missing price', NULL);
        RAISE EXCEPTION 'Missing price was accepted';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;
END $$;

INSERT INTO public.top_products (search_query, platform, name, price, quantity)
VALUES ('migration test milk', 'Blinkit', 'Migration test milk', 43.25, '500ml')
ON CONFLICT (search_query, location_key, platform, name, quantity)
DO UPDATE SET price = EXCLUDED.price;

DO $$
BEGIN
    IF (SELECT price FROM public.top_products WHERE search_query = 'migration test milk') <> 43.25 THEN
        RAISE EXCEPTION 'Offer upsert did not persist price';
    END IF;
END $$;

SET LOCAL ROLE dealdock_migration_test_user;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.top_products) OR EXISTS (SELECT 1 FROM public.canonical_products) THEN
        RAISE EXCEPTION 'RLS leaked server-only catalog rows';
    END IF;
END $$;
RESET ROLE;
ROLLBACK;
