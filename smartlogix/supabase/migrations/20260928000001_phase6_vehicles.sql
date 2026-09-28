-- Phase 6: Vehicle Management Migration

-- 1. Add vehicle_type and capacity_unit columns if not present
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'Van' 
CHECK (vehicle_type IN ('Motorcycle', 'Van', 'Small Truck', 'Large Truck'));

ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS capacity_unit TEXT NOT NULL DEFAULT 'kg' 
CHECK (capacity_unit IN ('kg', 'units', 'm3'));

-- 2. Add RLS Policies for vehicles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vehicles' AND policyname = 'Allow public insert on vehicles'
    ) THEN
        CREATE POLICY "Allow public insert on vehicles" ON vehicles FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vehicles' AND policyname = 'Allow public update on vehicles'
    ) THEN
        CREATE POLICY "Allow public update on vehicles" ON vehicles FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vehicles' AND policyname = 'Allow public delete on vehicles'
    ) THEN
        CREATE POLICY "Allow public delete on vehicles" ON vehicles FOR DELETE USING (true);
    END IF;
END $$;
