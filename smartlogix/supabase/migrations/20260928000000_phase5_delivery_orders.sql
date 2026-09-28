-- Phase 5: Delivery Locations & Order Management

-- 1. RLS Policies for delivery_locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'delivery_locations' AND policyname = 'Allow public insert on delivery_locations'
    ) THEN
        CREATE POLICY "Allow public insert on delivery_locations" ON delivery_locations FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'delivery_locations' AND policyname = 'Allow public update on delivery_locations'
    ) THEN
        CREATE POLICY "Allow public update on delivery_locations" ON delivery_locations FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'delivery_locations' AND policyname = 'Allow public delete on delivery_locations'
    ) THEN
        CREATE POLICY "Allow public delete on delivery_locations" ON delivery_locations FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' AND policyname = 'Allow public update on order_items'
    ) THEN
        CREATE POLICY "Allow public update on order_items" ON order_items FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'order_items' AND policyname = 'Allow public delete on order_items'
    ) THEN
        CREATE POLICY "Allow public delete on order_items" ON order_items FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Allow public delete on orders'
    ) THEN
        CREATE POLICY "Allow public delete on orders" ON orders FOR DELETE USING (true);
    END IF;
END $$;

-- 2. Atomic Order Creation Function
CREATE OR REPLACE FUNCTION create_order_atomic(
    p_delivery_location_id UUID,
    p_priority TEXT,
    p_items JSONB,
    p_warehouse_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_location RECORD;
    v_priority TEXT;
    v_order_number TEXT;
    v_order_id UUID;
    v_total_amount NUMERIC := 0;
    v_item JSONB;
    v_prod_id UUID;
    v_qty INT;
    v_prod RECORD;
    v_available_stock INT;
    v_line_subtotal NUMERIC;
    v_order_result JSONB;
    v_items_result JSONB;
    v_retries INT := 0;
    v_exists BOOLEAN;
BEGIN
    -- 1. Validate Delivery Location
    SELECT * INTO v_location FROM delivery_locations WHERE id = p_delivery_location_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delivery location does not exist (ID: %)', p_delivery_location_id;
    END IF;

    IF NOT v_location.is_active THEN
        RAISE EXCEPTION 'Delivery location "%" is deactivated and cannot receive new orders.', v_location.name;
    END IF;

    -- 2. Validate Items Array
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one product item.';
    END IF;

    -- 3. Validate Priority
    v_priority := UPPER(COALESCE(NULLIF(TRIM(p_priority), ''), 'MEDIUM'));
    IF v_priority NOT IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT') THEN
        RAISE EXCEPTION 'Invalid priority "%". Must be LOW, MEDIUM, HIGH, or URGENT.', p_priority;
    END IF;

    -- 4. Check stock availability, fetch prices, and calculate order total
    -- Aggregate duplicate product IDs if any are submitted
    CREATE TEMP TABLE tmp_aggregated_items (
        prod_id UUID PRIMARY KEY,
        qty INT NOT NULL,
        unit_price NUMERIC NOT NULL,
        subtotal NUMERIC NOT NULL
    ) ON COMMIT DROP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INT;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be a positive integer.';
        END IF;

        -- Verify product exists and get canonical unit_price
        SELECT * INTO v_prod FROM products WHERE id = v_prod_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product with ID % does not exist in catalog.', v_prod_id;
        END IF;

        -- Upsert into tmp table to sum quantities if user added duplicate rows
        INSERT INTO tmp_aggregated_items (prod_id, qty, unit_price, subtotal)
        VALUES (v_prod_id, v_qty, v_prod.unit_price, v_qty * v_prod.unit_price)
        ON CONFLICT (prod_id) DO UPDATE
        SET qty = tmp_aggregated_items.qty + EXCLUDED.qty,
            subtotal = (tmp_aggregated_items.qty + EXCLUDED.qty) * tmp_aggregated_items.unit_price;
    END LOOP;

    -- Now validate stock for each aggregated product
    FOR v_prod_id, v_qty, v_line_subtotal IN 
        SELECT prod_id, qty, subtotal FROM tmp_aggregated_items
    LOOP
        SELECT * INTO v_prod FROM products WHERE id = v_prod_id;

        IF p_warehouse_id IS NOT NULL THEN
            SELECT COALESCE(SUM(quantity), 0) INTO v_available_stock
            FROM inventory
            WHERE product_id = v_prod_id AND warehouse_id = p_warehouse_id;
        ELSE
            SELECT COALESCE(SUM(quantity), 0) INTO v_available_stock
            FROM inventory
            WHERE product_id = v_prod_id;
        END IF;

        IF v_available_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for product "%" (SKU: %). Requested: %, Available across warehouses: %',
                v_prod.name, v_prod.sku, v_qty, v_available_stock;
        END IF;

        v_total_amount := v_total_amount + v_line_subtotal;
    END LOOP;

    -- 5. Safely generate unique order number
    LOOP
        v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 89999 + 10000)::TEXT, 5, '0');
        SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = v_order_number) INTO v_exists;
        EXIT WHEN NOT v_exists;
        v_retries := v_retries + 1;
        IF v_retries > 20 THEN
            RAISE EXCEPTION 'Failed to generate unique order number after multiple attempts.';
        END IF;
    END LOOP;

    -- 6. Insert Order
    INSERT INTO orders (
        order_number,
        delivery_location_id,
        status,
        priority,
        total_amount
    ) VALUES (
        v_order_number,
        p_delivery_location_id,
        'PENDING',
        v_priority,
        v_total_amount
    ) RETURNING id INTO v_order_id;

    -- 7. Insert Order Items
    FOR v_prod_id, v_qty, v_line_subtotal IN
        SELECT prod_id, qty, subtotal FROM tmp_aggregated_items
    LOOP
        SELECT unit_price INTO v_prod FROM tmp_aggregated_items WHERE prod_id = v_prod_id;

        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            unit_price
        ) VALUES (
            v_order_id,
            v_prod_id,
            v_qty,
            v_prod.unit_price
        );
    END LOOP;

    -- 8. Return detailed created order
    SELECT row_to_json(o)::jsonb INTO v_order_result
    FROM orders o WHERE id = v_order_id;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'product', row_to_json(p)
        )
    ) INTO v_items_result
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = v_order_id;

    RETURN jsonb_build_object(
        'order', v_order_result,
        'items', v_items_result,
        'delivery_location', row_to_json(v_location)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_atomic(UUID, TEXT, JSONB, UUID) TO anon, authenticated, service_role;

-- 3. Order Status Transition Validation Function
CREATE OR REPLACE FUNCTION update_order_status(
    p_order_id UUID,
    p_new_status TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_target_status TEXT;
    v_result JSONB;
BEGIN
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found (ID: %)', p_order_id;
    END IF;

    v_target_status := UPPER(TRIM(p_new_status));
    IF v_target_status NOT IN ('PENDING', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid status "%". Must be PENDING, PROCESSING, DISPATCHED, DELIVERED, or CANCELLED.', p_new_status;
    END IF;

    -- If no change, return immediately
    IF v_order.status = v_target_status THEN
        SELECT row_to_json(o)::jsonb INTO v_result FROM orders o WHERE id = p_order_id;
        RETURN v_result;
    END IF;

    -- Terminal states check
    IF v_order.status = 'DELIVERED' THEN
        RAISE EXCEPTION 'Cannot modify an order that has already been DELIVERED.';
    END IF;

    IF v_order.status = 'CANCELLED' THEN
        RAISE EXCEPTION 'Cannot modify an order that has been CANCELLED.';
    END IF;

    -- Valid state transitions
    IF v_order.status = 'PENDING' AND v_target_status NOT IN ('PROCESSING', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid transition from PENDING to %. Allowed: PROCESSING, CANCELLED.', v_target_status;
    END IF;

    IF v_order.status = 'PROCESSING' AND v_target_status NOT IN ('DISPATCHED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid transition from PROCESSING to %. Allowed: DISPATCHED, CANCELLED.', v_target_status;
    END IF;

    IF v_order.status = 'DISPATCHED' AND v_target_status NOT IN ('DELIVERED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid transition from DISPATCHED to %. Allowed: DELIVERED, CANCELLED.', v_target_status;
    END IF;

    UPDATE orders
    SET status = v_target_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    SELECT row_to_json(o)::jsonb INTO v_result FROM orders o WHERE id = p_order_id;
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION update_order_status(UUID, TEXT) TO anon, authenticated, service_role;
