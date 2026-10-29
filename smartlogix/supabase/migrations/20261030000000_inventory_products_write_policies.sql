-- Migration: Allow public insert, update, and delete on inventory and products
CREATE POLICY "Allow public insert on inventory" ON inventory FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on inventory" ON inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on inventory" ON inventory FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow public insert on products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public update on products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on products" ON products FOR DELETE TO anon, authenticated USING (true);
