import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('warehouses').select('*').limit(1);
  if (error) {
    console.error("DB Connection Error:", error.message);
    process.exit(1);
  }
  console.log("DB Connection OK. Found tables, result:", data);
}

check();
