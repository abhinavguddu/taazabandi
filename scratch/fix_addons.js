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

async function main() {
  const updates = [
    { old: 'Dhaniya (Coriander)', new: 'Coriander' },
    { old: 'Nimbu (Lemon)', new: 'Lemon' },
    { old: 'Hari Mirch (Green Chilli)', new: 'Green Chilli' },
    { old: 'Adrak (Ginger)', new: 'Ginger' },
    { old: 'Pudina (Mint)', new: 'Mint' }
  ];

  for (const item of updates) {
    const { data, error } = await supabase
      .from('add_ons')
      .update({ name: item.new })
      .eq('name', item.old);
    
    if (error) {
      console.error('Error updating', item.old, error);
    } else {
      console.log('Successfully updated', item.old, 'to', item.new);
    }
  }
}

main();
