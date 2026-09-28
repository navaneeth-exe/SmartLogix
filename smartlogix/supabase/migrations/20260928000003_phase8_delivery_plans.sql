-- Phase 8: Delivery Plan Foundation Migration

-- 1. Create delivery_plans table
CREATE TABLE IF NOT EXISTS delivery_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_number TEXT NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create delivery_plan_orders junction table
CREATE TABLE IF NOT EXISTS delivery_plan_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_plan_id UUID NOT NULL REFERENCES delivery_plans(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(delivery_plan_id, order_id)
);

-- 3. Indexes for rapid lookups and eligibility checks
CREATE INDEX IF NOT EXISTS idx_delivery_plans_warehouse ON delivery_plans(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_delivery_plans_status ON delivery_plans(status);
CREATE INDEX IF NOT EXISTS idx_delivery_plan_orders_plan ON delivery_plan_orders(delivery_plan_id);
CREATE INDEX IF NOT EXISTS idx_delivery_plan_orders_order ON delivery_plan_orders(order_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE delivery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_plan_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- delivery_plans policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plans' AND policyname = 'Allow public read on delivery_plans') THEN
        CREATE POLICY "Allow public read on delivery_plans" ON delivery_plans FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plans' AND policyname = 'Allow public insert on delivery_plans') THEN
        CREATE POLICY "Allow public insert on delivery_plans" ON delivery_plans FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plans' AND policyname = 'Allow public update on delivery_plans') THEN
        CREATE POLICY "Allow public update on delivery_plans" ON delivery_plans FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plans' AND policyname = 'Allow public delete on delivery_plans') THEN
        CREATE POLICY "Allow public delete on delivery_plans" ON delivery_plans FOR DELETE USING (true);
    END IF;

    -- delivery_plan_orders policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plan_orders' AND policyname = 'Allow public read on delivery_plan_orders') THEN
        CREATE POLICY "Allow public read on delivery_plan_orders" ON delivery_plan_orders FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plan_orders' AND policyname = 'Allow public insert on delivery_plan_orders') THEN
        CREATE POLICY "Allow public insert on delivery_plan_orders" ON delivery_plan_orders FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plan_orders' AND policyname = 'Allow public update on delivery_plan_orders') THEN
        CREATE POLICY "Allow public update on delivery_plan_orders" ON delivery_plan_orders FOR UPDATE USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'delivery_plan_orders' AND policyname = 'Allow public delete on delivery_plan_orders') THEN
        CREATE POLICY "Allow public delete on delivery_plan_orders" ON delivery_plan_orders FOR DELETE USING (true);
    END IF;
END $$;

-- 5. Atomic delivery plan creation stored procedure
CREATE OR REPLACE FUNCTION create_delivery_plan_atomic(
    p_warehouse_id UUID,
    p_order_ids UUID[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_id UUID;
    v_plan_number TEXT;
    v_wh_exists BOOLEAN;
    v_order_count INT;
    v_conflict_count INT;
    v_order_id UUID;
    v_seq INT;
    v_result JSONB;
BEGIN
    -- Validate warehouse exists and is active
    SELECT EXISTS (
        SELECT 1 FROM warehouses WHERE id = p_warehouse_id AND is_active = true
    ) INTO v_wh_exists;

    IF NOT v_wh_exists THEN
        RAISE EXCEPTION 'Selected warehouse does not exist or is inactive.';
    END IF;

    -- Validate order selection
    v_order_count := array_length(p_order_ids, 1);
    IF v_order_count IS NULL OR v_order_count < 1 THEN
        RAISE EXCEPTION 'At least one customer order must be selected for the delivery plan.';
    END IF;

    -- Validate all orders exist and are in eligible status (not CANCELLED or DELIVERED)
    SELECT COUNT(*) INTO v_conflict_count
    FROM orders
    WHERE id = ANY(p_order_ids)
      AND status IN ('CANCELLED', 'DELIVERED');

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'One or more selected orders are CANCELLED or already DELIVERED.';
    END IF;

    -- Check if any selected order is already assigned to an active (PLANNED) delivery plan
    SELECT COUNT(*) INTO v_conflict_count
    FROM delivery_plan_orders dpo
    JOIN delivery_plans dp ON dp.id = dpo.delivery_plan_id
    WHERE dpo.order_id = ANY(p_order_ids)
      AND dp.status = 'PLANNED';

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'One or more selected orders are already assigned to an active delivery plan.';
    END IF;

    -- Generate a clean sequential plan number: PLN-YYYY-XXXX
    SELECT COUNT(*) + 1 INTO v_seq FROM delivery_plans;
    v_plan_number := 'PLN-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(v_seq::TEXT, 4, '0');

    -- Insert into delivery_plans
    INSERT INTO delivery_plans (
        plan_number,
        warehouse_id,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_plan_number,
        p_warehouse_id,
        'PLANNED',
        NOW(),
        NOW()
    ) RETURNING id INTO v_plan_id;

    -- Associate orders
    FOREACH v_order_id IN ARRAY p_order_ids LOOP
        INSERT INTO delivery_plan_orders (delivery_plan_id, order_id)
        VALUES (v_plan_id, v_order_id);
    END LOOP;

    -- Return JSON summary of created plan
    SELECT json_build_object(
        'id', dp.id,
        'plan_number', dp.plan_number,
        'warehouse_id', dp.warehouse_id,
        'status', dp.status,
        'created_at', dp.created_at,
        'order_count', v_order_count
    )::JSONB INTO v_result
    FROM delivery_plans dp
    WHERE dp.id = v_plan_id;

    RETURN v_result;
END;
$$;

-- 6. Plan cancellation stored procedure
CREATE OR REPLACE FUNCTION cancel_delivery_plan(
    p_plan_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_result JSONB;
BEGIN
    SELECT status INTO v_current_status
    FROM delivery_plans
    WHERE id = p_plan_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Delivery plan not found.';
    END IF;

    IF v_current_status <> 'PLANNED' THEN
        RAISE EXCEPTION 'Only plans with status PLANNED can be cancelled (current status: %).', v_current_status;
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
