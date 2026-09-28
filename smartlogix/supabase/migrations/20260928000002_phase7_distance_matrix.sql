-- Phase 7: Distance Matrix Migration

CREATE TABLE IF NOT EXISTS location_distances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_id UUID NOT NULL,
    destination_id UUID NOT NULL,
    distance NUMERIC NOT NULL CHECK (distance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(origin_id, destination_id)
);

ALTER TABLE location_distances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'location_distances' AND policyname = 'Allow public read on location_distances'
    ) THEN
        CREATE POLICY "Allow public read on location_distances" ON location_distances FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'location_distances' AND policyname = 'Allow public insert on location_distances'
    ) THEN
        CREATE POLICY "Allow public insert on location_distances" ON location_distances FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'location_distances' AND policyname = 'Allow public update on location_distances'
    ) THEN
        CREATE POLICY "Allow public update on location_distances" ON location_distances FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'location_distances' AND policyname = 'Allow public delete on location_distances'
    ) THEN
        CREATE POLICY "Allow public delete on location_distances" ON location_distances FOR DELETE USING (true);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION save_location_distance(
    p_origin_id UUID,
    p_destination_id UUID,
    p_distance NUMERIC,
    p_symmetric BOOLEAN DEFAULT true
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO location_distances (origin_id, destination_id, distance, updated_at)
    VALUES (p_origin_id, p_destination_id, p_distance, NOW())
    ON CONFLICT (origin_id, destination_id)
    DO UPDATE SET distance = EXCLUDED.distance, updated_at = NOW();

    IF p_symmetric AND p_origin_id != p_destination_id THEN
        INSERT INTO location_distances (origin_id, destination_id, distance, updated_at)
        VALUES (p_destination_id, p_origin_id, p_distance, NOW())
        ON CONFLICT (origin_id, destination_id)
        DO UPDATE SET distance = EXCLUDED.distance, updated_at = NOW();
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION save_location_distance(UUID, UUID, NUMERIC, BOOLEAN) TO anon, authenticated, service_role;
