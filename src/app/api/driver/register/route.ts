import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client - bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This key bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      name,
      aadharNumber,
      panNumber,
      licenseNumber,
      aadharPhotoUrl,
      licensePhotoUrl,
      vehicleNumber,
      vehicleType,
      capacityKg,
      rcPhotoUrl,
      insuranceValidTill,
    } = body;

    // Validate required fields
    if (!userId || !name || !aadharNumber || !licenseNumber || !vehicleNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update profile name
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ name })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // Upsert driver record (using service role - bypasses RLS)
    const { data: driverData, error: driverError } = await supabaseAdmin
      .from('drivers')
      .upsert({
        id: userId,
        aadhar_number: aadharNumber,
        pan_number: panNumber,
        license_number: licenseNumber,
        aadhar_photo_url: aadharPhotoUrl,
        license_photo_url: licensePhotoUrl,
        approval_status: 'pending',
        is_approved: false,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (driverError) {
      console.error('Driver upsert error:', driverError);
      return NextResponse.json(
        { error: 'Failed to save driver information', details: driverError },
        { status: 500 }
      );
    }

    // Upsert vehicle record (using service role - bypasses RLS)
    const { data: vehicleData, error: vehicleError } = await supabaseAdmin
      .from('vehicles')
      .upsert({
        driver_id: userId,
        vehicle_number: vehicleNumber,
        vehicle_type: vehicleType,
        capacity_kg: parseInt(capacityKg),
        rc_photo_url: rcPhotoUrl,
        insurance_valid_till: insuranceValidTill,
        is_approved: false,
        status: 'available',
      }, {
        onConflict: 'driver_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (vehicleError) {
      console.error('Vehicle upsert error:', vehicleError);
      return NextResponse.json(
        { error: 'Failed to save vehicle information', details: vehicleError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      driver: driverData,
      vehicle: vehicleData,
    });

  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
