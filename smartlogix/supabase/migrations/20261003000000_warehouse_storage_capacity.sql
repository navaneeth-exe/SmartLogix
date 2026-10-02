-- Migration: 20261003000000_warehouse_storage_capacity.sql
-- Description: Phase 1 - Add warehouse storage capacity foundation

ALTER TABLE warehouses
ADD COLUMN IF NOT EXISTS storage_capacity NUMERIC NULL CHECK (storage_capacity IS NULL OR storage_capacity > 0);

COMMENT ON COLUMN warehouses.storage_capacity IS 'Maximum physical storage capacity available at this warehouse depot (e.g. units or kg). Nullable for backward compatibility.';
