import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client - bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized or invalid token' }, { status: 401 });
    }

    // Verify if user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Load drivers using supabaseAdmin (bypassing RLS)
    const { data, error } = await supabaseAdmin
      .from('drivers')
      .select(`
        id,
        aadhar_number,
        license_number,
        pan_number,
        aadhar_photo_url,
        license_photo_url,
        approval_status,
        is_approved,
        rating,
        total_deliveries,
        is_online,
        created_at,
        profiles(name, phone),
        zones(name),
        vehicles!driver_id(
          vehicle_number,
          vehicle_type,
          capacity_kg,
          rc_photo_url,
          insurance_valid_till
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, drivers: data });
  } catch (error: any) {
    console.error('Admin drivers API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
