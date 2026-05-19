const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('--- Testing Qualifier 1: vehicles!vehicles_driver_id_fkey ---');
  try {
    const { data: d1, error: e1 } = await supabase
      .from('drivers')
      .select(`
        id,
        vehicles!vehicles_driver_id_fkey(vehicle_number)
      `)
      .limit(1);
    console.log('Success 1:', !!d1, e1 || '');
  } catch (err) {
    console.error('Error 1:', err);
  }

  console.log('--- Testing Qualifier 2: vehicles!driver_id ---');
  try {
    const { data: d2, error: e2 } = await supabase
      .from('drivers')
      .select(`
        id,
        vehicles!driver_id(vehicle_number)
      `)
      .limit(1);
    console.log('Success 2:', !!d2, e2 || '');
  } catch (err) {
    console.error('Error 2:', err);
  }
}

run();
