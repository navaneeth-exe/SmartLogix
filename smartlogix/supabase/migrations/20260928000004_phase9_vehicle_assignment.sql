-- Phase 9: Vehicle Assignment Migration

-- 1. Add weight_kg to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC NOT NULL DEFAULT 10.0 CHECK (weight_kg > 0);

-- Update realistic product weights
UPDATE products SET weight_kg = 45.0 WHERE sku = 'SOL-INV-5000';
UPDATE products SET weight_kg = 35.0 WHERE sku = 'BAT-LITH-48V';
UPDATE products SET weight_kg = 60.0 WHERE sku = 'CNV-RLR-001';
UPDATE products SET weight_kg = 1.5 WHERE sku = 'SCN-BC-PRO';
UPDATE products SET weight_kg = 75.0 WHERE sku = 'PLT-JCK-25T';
UPDATE products SET weight_kg = 12.0 WHERE sku = 'STR-POLY-1K';

-- 2. Add vehicle_id to delivery_plans
ALTER TABLE delivery_plans 
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_plans_vehicle ON delivery_plans(vehicle_id);

-- Enforce at most ONE active delivery plan per vehicle concurrently
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_plans_active_vehicle 
ON delivery_plans(vehicle_id) 
WHERE status = 'PLANNED' AND vehicle_id IS NOT NULL;

-- 3. Stored Procedure: Assign or Change Vehicle for a Delivery Plan
CREATE OR REPLACE FUNCTION assign_vehicle_to_delivery_plan(
    p_plan_id UUID,
    p_vehicle_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
    v_vehicle RECORD;
    v_old_vehicle_id UUID;
    v_total_weight NUMERIC := 0;
    v_total_units INT := 0;
    v_required_capacity NUMERIC := 0;
    v_result JSONB;
BEGIN
    -- 1. Validate Plan
    SELECT * INTO v_plan
    FROM delivery_plans
    WHERE id = p_plan_id;

    IF v_plan.id IS NULL THEN
        RAISE EXCEPTION 'Delivery plan not found.';
    END IF;

    IF v_plan.status <> 'PLANNED' THEN
        RAISE EXCEPTION 'Cannot assign vehicle: Plan % is already %.', v_plan.plan_number, v_plan.status;
    END IF;

    -- 2. Validate Vehicle
    SELECT * INTO v_vehicle
    FROM vehicles
    WHERE id = p_vehicle_id;

    IF v_vehicle.id IS NULL THEN
        RAISE EXCEPTION 'Vehicle not found.';
    END IF;

    -- Check availability (allow re-assigning if already assigned to this exact plan)
    IF v_vehicle.status <> 'AVAILABLE' AND (v_plan.vehicle_id IS NULL OR v_plan.vehicle_id <> p_vehicle_id) THEN
        RAISE EXCEPTION 'Vehicle % (%) is not available (current status: %).', 
            v_vehicle.name, v_vehicle.registration_number, v_vehicle.status;
    END IF;

    -- Check conflicting active plans
    IF EXISTS (
        SELECT 1 FROM delivery_plans 
        WHERE vehicle_id = p_vehicle_id 
          AND status = 'PLANNED' 
          AND id <> p_plan_id
    ) THEN
        RAISE EXCEPTION 'Vehicle % (%) is already assigned to another active delivery plan.', 
            v_vehicle.name, v_vehicle.registration_number;
    END IF;

    -- 3. Calculate Plan Capacity Requirements from actual orders & items
    SELECT 
        COALESCE(SUM(oi.quantity * p.weight_kg), 0),
        COALESCE(SUM(oi.quantity), 0)
    INTO v_total_weight, v_total_units
    FROM delivery_plan_orders dpo
    JOIN orders o ON dpo.order_id = o.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE dpo.delivery_plan_id = p_plan_id;

    -- Validate Capacity Match
    IF v_vehicle.capacity_unit = 'kg' THEN
        v_required_capacity := v_total_weight;
        IF v_required_capacity > v_vehicle.capacity THEN
            RAISE EXCEPTION 'Insufficient capacity: Plan requires % kg, but vehicle % can only carry % kg.',
                v_required_capacity, v_vehicle.name, v_vehicle.capacity;
        END IF;
    ELSIF v_vehicle.capacity_unit = 'units' THEN
        v_required_capacity := v_total_units;
        IF v_required_capacity > v_vehicle.capacity THEN
            RAISE EXCEPTION 'Insufficient capacity: Plan requires % units, but vehicle % can only carry % units.',
                v_required_capacity, v_vehicle.name, v_vehicle.capacity;
        END IF;
    ELSE
        RAISE EXCEPTION 'Unsupported vehicle capacity unit: % for vehicle %.', 
            v_vehicle.capacity_unit, v_vehicle.name;
    END IF;

    -- 4. Update Previous Vehicle if changing
    v_old_vehicle_id := v_plan.vehicle_id;
    IF v_old_vehicle_id IS NOT NULL AND v_old_vehicle_id <> p_vehicle_id THEN
        UPDATE vehicles 
        SET status = 'AVAILABLE', updated_at = NOW() 
        WHERE id = v_old_vehicle_id;
    END IF;

    -- 5. Assign to Plan & Mark Vehicle In-Use / ON_ROUTE
    UPDATE delivery_plans
    SET vehicle_id = p_vehicle_id, updated_at = NOW()
    WHERE id = p_plan_id;

    UPDATE vehicles
    SET status = 'ON_ROUTE', updated_at = NOW()
    WHERE id = p_vehicle_id;

    SELECT json_build_object(
        'plan_id', v_plan.id,
        'plan_number', v_plan.plan_number,
        'vehicle_id', v_vehicle.id,
        'vehicle_name', v_vehicle.name,
        'registration_number', v_vehicle.registration_number,
        'vehicle_capacity', v_vehicle.capacity,
        'capacity_unit', v_vehicle.capacity_unit,
        'required_capacity', v_required_capacity,
        'status', 'ASSIGNED'
    )::JSONB INTO v_result;

    RETURN v_result;
END;
$$;

-- 4. Stored Procedure: Remove Vehicle from Delivery Plan
CREATE OR REPLACE FUNCTION remove_vehicle_from_delivery_plan(
    p_plan_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan RECORD;
    v_old_vehicle_id UUID;
    v_result JSONB;
BEGIN
    SELECT * INTO v_plan
    FROM delivery_plans
    WHERE id = p_plan_id;

    IF v_plan.id IS NULL THEN
        RAISE EXCEPTION 'Delivery plan not found.';
    END IF;

    IF v_plan.status <> 'PLANNED' THEN
        RAISE EXCEPTION 'Cannot modify vehicle on a % plan.', v_plan.status;
    END IF;

    v_old_vehicle_id := v_plan.vehicle_id;
    IF v_old_vehicle_id IS NOT NULL THEN
        UPDATE vehicles
        SET status = 'AVAILABLE', updated_at = NOW()
        WHERE id = v_old_vehicle_id;

        UPDATE delivery_plans
        SET vehicle_id = NULL, updated_at = NOW()
        WHERE id = p_plan_id;
    END IF;

    SELECT json_build_object(
        'plan_id', v_plan.id,
        'plan_number', v_plan.plan_number,
        'vehicle_id', NULL,
        'status', 'REMOVED'
    )::JSONB INTO v_result;

    RETURN v_result;
END;
$$;

-- 5. Update cancel_delivery_plan to safely release any assigned vehicle
CREATE OR REPLACE FUNCTION cancel_delivery_plan(
    p_plan_id UUID
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
        RAISE EXCEPTION 'Only plans with status PLANNED can be cancelled (current status: %).', v_plan.status;
    END IF;

    -- Release assigned vehicle back to AVAILABLE
    IF v_plan.vehicle_id IS NOT NULL THEN
        UPDATE vehicles
        SET status = 'AVAILABLE', updated_at = NOW()
        WHERE id = v_plan.vehicle_id;
    END IF;

    UPDATE delivery_plans
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = p_plan_id
    RETURNING json_build_object(
        'id', id,
        'plan_number', plan_number,
        'status', status,
        'updated_at', updated_at
    )::JSONB INTO v_result;

    RETURN v_result;
END;
$$;
