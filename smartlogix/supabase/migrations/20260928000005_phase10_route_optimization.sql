-- Phase 10: Route Optimization Migration

-- 1. Add route fields to delivery_plans
ALTER TABLE delivery_plans
ADD COLUMN IF NOT EXISTS route_algorithm TEXT,
ADD COLUMN IF NOT EXISTS route_stops JSONB,
ADD COLUMN IF NOT EXISTS route_distance NUMERIC,
ADD COLUMN IF NOT EXISTS route_execution_time_ms NUMERIC,
ADD COLUMN IF NOT EXISTS route_generated_at TIMESTAMP WITH TIME ZONE;

-- 2. Stored procedure to persist optimized route against plan
CREATE OR REPLACE FUNCTION save_delivery_plan_route(
    p_plan_id UUID,
    p_algorithm TEXT,
    p_stops JSONB,
    p_distance NUMERIC,
    p_time_ms NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_plan
    FROM delivery_plans
    WHERE id = p_plan_id;

    IF v_plan.id IS NULL THEN
        RAISE EXCEPTION 'Delivery plan not found.';
    END IF;

    IF v_plan.status <> 'PLANNED' THEN
        RAISE EXCEPTION 'Cannot generate or save route: Plan % is %.', v_plan.plan_number, v_plan.status;
    END IF;

    UPDATE delivery_plans
    SET route_algorithm = p_algorithm,
        route_stops = p_stops,
        route_distance = p_distance,
        route_execution_time_ms = p_time_ms,
        route_generated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_plan_id
    RETURNING json_build_object(
        'id', id,
        'plan_number', plan_number,
        'route_algorithm', route_algorithm,
        'route_distance', route_distance,
        'route_execution_time_ms', route_execution_time_ms,
        'route_generated_at', route_generated_at,
        'route_stops', route_stops
    )::JSONB INTO v_result;

    RETURN v_result;
END;
$$;

-- 3. Populate complete simulation distances for active warehouses and delivery locations
DO $$
DECLARE
    locs UUID[];
    i INT;
    j INT;
    n INT;
    v_origin UUID;
    v_dest UUID;
    v_dist NUMERIC;
BEGIN
    SELECT array_agg(id) INTO locs FROM (
        SELECT id FROM warehouses
        UNION ALL
        SELECT id FROM delivery_locations WHERE is_active = true
    ) all_locs;

    n := array_length(locs, 1);

    FOR i IN 1..n LOOP
        FOR j IN 1..n LOOP
            v_origin := locs[i];
            v_dest := locs[j];
            IF v_origin <> v_dest THEN
                -- Deterministic simulated transit distance between 10 km and 45 km
                v_dist := 12 + (((i * 7) + (j * 13)) % 32);
                PERFORM save_location_distance(v_origin, v_dest, v_dist, true);
            END IF;
        END LOOP;
    END LOOP;
END $$;
