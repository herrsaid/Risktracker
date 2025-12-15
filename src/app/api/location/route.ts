import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify authorization token
    const authHeader = request.headers.get('authorization');
    // if (authHeader !== 'Bearer your-secret-token') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Parse Overland data
    const body = await request.json();
    const { locations } = body;

    if (!locations || locations.length === 0) {
      return NextResponse.json({ error: 'No locations provided' }, { status: 400 });
    }

    // Get the most recent location from the batch
    const latestLocation = locations[locations.length - 1];
    const { properties, geometry } = latestLocation;

    if (!properties.device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 });
    }

    // Extract coordinates [longitude, latitude]
    const [longitude, latitude] = geometry.coordinates;

    // Use the PostgreSQL function to update location with geometry
    const { error } = await supabase.rpc('upsert_location', {
      p_device_id: properties.device_id,
      p_longitude: longitude,
      p_latitude: latitude,
      p_battery: properties.battery_level ? Math.round(properties.battery_level * 100) : null,
      p_altitude_m: properties.altitude || null,
      p_accuracy_m: properties.horizontal_accuracy || null,
      p_last_seen: properties.timestamp || new Date().toISOString()
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('Location updated for device:', properties.device_id);

    // IMPORTANT: Must respond with this exact format for Overland
    return NextResponse.json({ result: 'ok' });
    
  } catch (error) {
    console.error('Error processing location:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
