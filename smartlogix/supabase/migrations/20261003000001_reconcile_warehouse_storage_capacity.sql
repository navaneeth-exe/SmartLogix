-- Migration: 20261003000001_reconcile_warehouse_storage_capacity.sql
-- Description: Phase 9 Schema Reconciliation - Add storage_capacity to warehouses table

ALTER TABLE warehouses
ADD COLUMN IF NOT EXISTS storage_capacity NUMERIC NULL CHECK (storage_capacity IS NULL OR storage_capacity > 0);

COMMENT ON COLUMN warehouses.storage_capacity IS 'Maximum physical storage capacity available at this warehouse depot (units or kg). Nullable for backward compatibility.';
