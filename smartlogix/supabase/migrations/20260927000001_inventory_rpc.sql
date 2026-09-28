-- RPC for safe inventory updates

CREATE OR REPLACE FUNCTION update_inventory_stock(
    p_warehouse_id UUID,
    p_product_id UUID,
    p_quantity INTEGER,
    p_reorder_level INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
    v_inventory_id UUID;
    v_result JSONB;
BEGIN
    IF p_quantity < 0 THEN
        RAISE EXCEPTION 'Quantity cannot be negative';
    END IF;

    INSERT INTO inventory (warehouse_id, product_id, quantity, reorder_level)
    VALUES (p_warehouse_id, p_product_id, p_quantity, p_reorder_level)
    ON CONFLICT (warehouse_id, product_id)
    DO UPDATE SET 
        quantity = EXCLUDED.quantity,
        reorder_level = EXCLUDED.reorder_level,
        updated_at = NOW()
    RETURNING id INTO v_inventory_id;
    
    SELECT row_to_json(i)::jsonb INTO v_result
    FROM inventory i
    WHERE id = v_inventory_id;
    
    RETURN v_result;
END;
 LANGUAGE plpgsql;
