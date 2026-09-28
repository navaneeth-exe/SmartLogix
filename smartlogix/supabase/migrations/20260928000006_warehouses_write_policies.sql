-- Migration: Allow public update and insert on warehouses for interactive map management
CREATE POLICY "Allow public update on warehouses" ON warehouses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert on warehouses" ON warehouses FOR INSERT TO anon, authenticated WITH CHECK (true);
