/**
 * Calculates a destination point given a starting point, bearing, and distance
 * @param lat Starting latitude
 * @param lng Starting longitude
 * @param bearing Direction in degrees (0-360)
 * @param distanceKm Distance in kilometers
 * @returns [lat, lng] of destination point
 */
function calculateDestinationPoint(
  lat: number,
  lng: number,
  bearing: number,
  distanceKm: number
): [number, number] {
  // Earth's radius in kilometers
  const R = 6371
  
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const bearingRad = (bearing * Math.PI) / 180
  
  const angularDistance = distanceKm / R
  
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
    Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  )
  
  const newLngRad = lngRad + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
    Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad)
  )
  
  return [
    (newLatRad * 180) / Math.PI,
    (newLngRad * 180) / Math.PI
  ]
}

/**
 * Calculates gas risk zones based on wind data
 * @param centerLat Center latitude of gas source
 * @param centerLng Center longitude of gas source
 * @param windSpeed Wind speed in m/s
 * @param windDirection Direction wind is blowing TO (0-360 degrees)
 * @returns Object containing critical (danger) and alert zone geometries
 */
export function calculateGasRiskZones(
  centerLat: number,
  centerLng: number,
  windSpeed: number,
  windDirection: number
) {
  // Constants
  const K_c = 0.5 // Critical dispersion factor
  const PLUME_DIST_KM = 8 // Alert plume distance in km
  const INITIAL_RADIUS_M = 100 // Initial radius in meters (100m default)
  const SPREAD_ANGLE = 30 // Plume spread angle in degrees
  
  // 1. Calculate Critical Zone (Danger Circle)
  // R_c = Initial Radius + (K_c * (500 / Wind Speed))
  const effectiveWindSpeed = Math.max(windSpeed, 1.0) // Floor at 1 m/s
  const criticalRadiusM = INITIAL_RADIUS_M + (K_c * 500 / effectiveWindSpeed)
  
  // 2. Calculate Alert Zone (Wind-Driven Plume)
  // Wind direction is where gas is blowing TO
  const plumeBearing = windDirection
  
  // Calculate three key points of the plume
  
  // A. Center endpoint: PLUME_DIST_KM on the plume bearing
  const centerEnd = calculateDestinationPoint(
    centerLat,
    centerLng,
    plumeBearing,
    PLUME_DIST_KM
  )
  
  // B. Left endpoint: PLUME_DIST_KM at (bearing - spread/2)
  const leftBearing = (plumeBearing - SPREAD_ANGLE / 2 + 360) % 360
  const leftEnd = calculateDestinationPoint(
    centerLat,
    centerLng,
    leftBearing,
    PLUME_DIST_KM * 1.1
  )
  
  // C. Right endpoint: PLUME_DIST_KM at (bearing + spread/2)
  const rightBearing = (plumeBearing + SPREAD_ANGLE / 2) % 360
  const rightEnd = calculateDestinationPoint(
    centerLat,
    centerLng,
    rightBearing,
    PLUME_DIST_KM * 1.1
  )
  
  // Create alert polygon (triangular plume shape)
  const alertPolygonCoords: [number, number][] = [
    [centerLat, centerLng],
    leftEnd,
    centerEnd,
    rightEnd,
  ]
  
  return {
    dangerZone: {
      type: 'circle' as const,
      center: [centerLat, centerLng] as [number, number],
      radius: criticalRadiusM,
    },
    alertZone: {
      type: 'polygon' as const,
      coordinates: alertPolygonCoords,
    },
  }
}
