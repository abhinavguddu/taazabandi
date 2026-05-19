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
  console.log('--- Testing Zones & Generating Slots ---');
  
  // 1. Get zones
  const { data: zones, error: zonesErr } = await supabase.from('zones').select('*');
  console.log('Zones count:', zones ? zones.length : 0, zonesErr || '');
  if (zones && zones.length > 0) {
    console.log('Sample zone:', zones[0]);
    
    // Auto-generate slots for today for all active zones
    const dateStr = new Date().toISOString().split('T')[0];
    console.log('Generating slots for date:', dateStr);
    
    for (const zone of zones) {
      if (!zone.is_active) continue;
      
      const { data: existing } = await supabase
        .from('slots')
        .select('id')
        .eq('zone_id', zone.id)
        .eq('date', dateStr);
        
      if (existing && existing.length > 0) {
        console.log(`Slots for zone ${zone.name} on ${dateStr} already exist.`);
        continue;
      }
      
      const morningSlot = {
        zone_id: zone.id,
        slot_type: 'morning',
        slot_label: '6:00 AM - 9:00 AM',
        date: dateStr,
        total_capacity: zone.morning_slot_capacity || 250,
        booked_count: 0,
        is_full: false
      };
      
      const eveningSlot = {
        zone_id: zone.id,
        slot_type: 'evening',
        slot_label: '5:00 PM - 8:00 PM',
        date: dateStr,
        total_capacity: zone.evening_slot_capacity || 150,
        booked_count: 0,
        is_full: false
      };
      
      const { error: errM } = await supabase.from('slots').insert(morningSlot);
      const { error: errE } = await supabase.from('slots').insert(eveningSlot);
      
      console.log(`Generated morning slot for ${zone.name}:`, errM || 'Success');
      console.log(`Generated evening slot for ${zone.name}:`, errE || 'Success');
    }
  } else {
    console.log('No zones found. Creating a default zone first...');
    const defaultZone = {
      name: 'Indirapuram (Ghaziabad)',
      pincode: '201014',
      areas: ['Niti Khand', 'Vaibhav Khand', 'Ahinsa Khand'],
      morning_slot_capacity: 250,
      evening_slot_capacity: 150,
      is_active: true
    };
    
    const { data: newZone, error: zoneErr } = await supabase.from('zones').insert(defaultZone).select().single();
    if (zoneErr) {
      console.error('Error creating default zone:', zoneErr);
    } else {
      console.log('Created default zone:', newZone);
      // Now run main again to generate slots!
      await main();
    }
  }
}

main();
