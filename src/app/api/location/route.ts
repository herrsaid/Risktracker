import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization');
    

    // Parse the location data from Overland
    const body = await request.json();
    const { locations } = body;

    // Process or store the location data
    // You can save to database, send to another service, etc.
    console.log('Received locations:', locations);

    return NextResponse.json({ result: 'ok' });
    
  } catch (error) {
    console.error('Error processing location:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
