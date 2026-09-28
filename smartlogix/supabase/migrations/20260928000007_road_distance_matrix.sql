-- Migration: Road Distance Matrix schema updates
ALTER TABLE location_distances 
ADD COLUMN IF NOT EXISTS distance_meters NUMERIC,
ADD COLUMN IF NOT EXISTS distance_source VARCHAR(50) DEFAULT 'MANUAL_SIMULATION',
ADD COLUMN IF NOT EXISTS routing_profile VARCHAR(50) DEFAULT 'driving-car',
ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC,
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE OR REPLACE FUNCTION save_location_distance(
    p_origin_id UUID,
    p_destination_id UUID,
    p_distance NUMERIC,
    p_symmetric BOOLEAN DEFAULT true,
    p_distance_meters NUMERIC DEFAULT NULL,
    p_distance_source VARCHAR DEFAULT 'MANUAL_SIMULATION',
    p_routing_profile VARCHAR DEFAULT 'driving-car',
    p_duration_seconds NUMERIC DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO location_distances (
        origin_id, 
        destination_id, 
        distance, 
        distance_meters,
        distance_source,
        routing_profile,
        duration_seconds,
        generated_at,
        updated_at
    )
    VALUES (
        p_origin_id, 
        p_destination_id, 
        p_distance, 
        COALESCE(p_distance_meters, p_distance * 1000),
        p_distance_source,
        p_routing_profile,
        p_duration_seconds,
        NOW(),
        NOW()
    )
    ON CONFLICT (origin_id, destination_id)
    DO UPDATE SET 
        distance = EXCLUDED.distance, 
        distance_meters = EXCLUDED.distance_meters,
        distance_source = EXCLUDED.distance_source,
        routing_profile = EXCLUDED.routing_profile,
        duration_seconds = EXCLUDED.duration_seconds,
        generated_at = NOW(),
        updated_at = NOW();

    IF p_symmetric AND p_origin_id != p_destination_id THEN
        INSERT INTO location_distances (
            origin_id, 
            destination_id, 
            distance, 
            distance_meters,
            distance_source,
            routing_profile,
            duration_seconds,
            generated_at,
            updated_at
        )
        VALUES (
            p_destination_id, 
            p_origin_id, 
            p_distance, 
            COALESCE(p_distance_meters, p_distance * 1000),
            p_distance_source,
            p_routing_profile,
            p_duration_seconds,
            NOW(),
            NOW()
        )
        ON CONFLICT (origin_id, destination_id)
        DO UPDATE SET 
            distance = EXCLUDED.distance, 
            distance_meters = EXCLUDED.distance_meters,
            distance_source = EXCLUDED.distance_source,
            routing_profile = EXCLUDED.routing_profile,
            duration_seconds = EXCLUDED.duration_seconds,
            generated_at = NOW(),
            updated_at = NOW();
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION save_location_distance(UUID, UUID, NUMERIC, BOOLEAN, NUMERIC, VARCHAR, VARCHAR, NUMERIC) TO anon, authenticated, service_role;
