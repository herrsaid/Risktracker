'use server'

import { supabase } from '@/lib/supabase'
import { Zone, MachineZone, GasSourcePoint } from '@/components/zones/zones-map'

export async function saveZone(zone: Omit<Zone, 'id' | 'createdAt'>) {
  try {
    if (zone.source === 'machine') {
      const machineZone = zone as Omit<MachineZone, 'id' | 'createdAt'>
      
      let dangerGeometry = null
      let dangerCenter = null
      let dangerRadius = null
      let alertGeometry = null
      let alertCenter = null
      let alertRadius = null

      if (machineZone.shape === 'polygon' && machineZone.dangerZone.coordinates) {
        // Convert coordinates to PostGIS POLYGON format
        const dangerCoords = [...machineZone.dangerZone.coordinates, machineZone.dangerZone.coordinates[0]]
          .map(([lat, lng]) => `${lng} ${lat}`)
          .join(', ')
        dangerGeometry = `SRID=4326;POLYGON((${dangerCoords}))`

        if (machineZone.alertZone.coordinates) {
          const alertCoords = [...machineZone.alertZone.coordinates, machineZone.alertZone.coordinates[0]]
            .map(([lat, lng]) => `${lng} ${lat}`)
            .join(', ')
          alertGeometry = `SRID=4326;POLYGON((${alertCoords}))`
        }
      } else if (machineZone.shape === 'circle') {
        dangerCenter = `SRID=4326;POINT(${machineZone.dangerZone.center![1]} ${machineZone.dangerZone.center![0]})`
        dangerRadius = machineZone.dangerZone.radius

        alertCenter = `SRID=4326;POINT(${machineZone.alertZone.center![1]} ${machineZone.alertZone.center![0]})`
        alertRadius = machineZone.alertZone.radius
      }

      const { data, error } = await supabase
        .from('zones')
        .insert({
          name: machineZone.name,
          source: 'machine',
          shape: machineZone.shape,
          danger_zone_geometry: dangerGeometry,
          danger_zone_center: dangerCenter,
          danger_zone_radius: dangerRadius,
          alert_zone_geometry: alertGeometry,
          alert_zone_center: alertCenter,
          alert_zone_radius: alertRadius,
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
      
    } else {
      // Gas source point
      const gasZone = zone as Omit<GasSourcePoint, 'id' | 'createdAt'>
      
      const position = `SRID=4326;POINT(${gasZone.position[1]} ${gasZone.position[0]})`

      const { data, error } = await supabase
        .from('zones')
        .insert({
          name: gasZone.name,
          source: 'gas',
          gas_source_position: position,
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }
  } catch (error) {
    console.error('Error saving zone:', error)
    return { data: null, error: 'Failed to save zone' }
  }
}

export async function fetchZones(): Promise<Zone[]> {
  try {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log('Raw zones from database:', data) // Debug log

    const zones: Zone[] = data.map((row: any) => {
      if (row.source === 'machine') {
        const machineZone: MachineZone = {
          id: row.id,
          name: row.name,
          source: 'machine',
          shape: row.shape,
          dangerZone: {},
          alertZone: {},
          createdAt: row.created_at,
        }

        if (row.shape === 'polygon') {
          // Parse PostGIS POLYGON to coordinates array
          if (row.danger_zone_geometry) {
            const coords = parsePostGISGeometry(row.danger_zone_geometry)
            console.log('Parsed danger polygon:', coords) // Debug log
            machineZone.dangerZone.coordinates = coords
          }
          if (row.alert_zone_geometry) {
            const coords = parsePostGISGeometry(row.alert_zone_geometry)
            console.log('Parsed alert polygon:', coords) // Debug log
            machineZone.alertZone.coordinates = coords
          }
        } else {
          // Circle
          if (row.danger_zone_center) {
            const point = parsePostGISGeometry(row.danger_zone_center)
            console.log('Parsed danger circle center:', point) // Debug log
            machineZone.dangerZone.center = point as [number, number]
            machineZone.dangerZone.radius = row.danger_zone_radius
          }
          if (row.alert_zone_center) {
            const point = parsePostGISGeometry(row.alert_zone_center)
            console.log('Parsed alert circle center:', point) // Debug log
            machineZone.alertZone.center = point as [number, number]
            machineZone.alertZone.radius = row.alert_zone_radius
          }
        }

        return machineZone
      } else {
        // Gas source
        const position = parsePostGISGeometry(row.gas_source_position)
        console.log('Parsed gas source position:', position) // Debug log
        
        const gasZone: GasSourcePoint = {
          id: row.id,
          name: row.name,
          source: 'gas',
          position: position as [number, number],
          createdAt: row.created_at,
        }

        if (row.gas_danger_zone) {
          gasZone.dangerZone = {
            coordinates: parsePostGISGeometry(row.gas_danger_zone) as [number, number][],
          }
        }
        if (row.gas_alert_zone) {
          gasZone.alertZone = {
            coordinates: parsePostGISGeometry(row.gas_alert_zone) as [number, number][],
          }
        }

        return gasZone
      }
    })

    console.log('Parsed zones:', zones) // Debug log
    return zones
  } catch (error) {
    console.error('Error fetching zones:', error)
    return []
  }
}

export async function deleteZone(zoneId: string) {
  try {
    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', zoneId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting zone:', error)
    return { success: false, error: 'Failed to delete zone' }
  }
}

// Unified helper function to parse PostGIS geometries
function parsePostGISGeometry(geom: any): [number, number][] | [number, number] {
  if (!geom) return []
  
  // Handle GeoJSON format (what Supabase actually returns)
  if (typeof geom === 'object' && geom.type) {
    if (geom.type === 'Point') {
      // Point: { type: 'Point', coordinates: [lng, lat] }
      return [geom.coordinates[1], geom.coordinates[0]] as [number, number]
    } else if (geom.type === 'Polygon') {
      // Polygon: { type: 'Polygon', coordinates: [[[lng, lat], ...]] }
      const coords = geom.coordinates[0].map((coord: number[]) => 
        [coord[1], coord[0]] as [number, number]
      )
      return coords.slice(0, -1) // Remove duplicate closing point
    }
  }
  
  // Fallback to WKT string parsing
  if (typeof geom === 'string') {
    // Parse POINT
    const pointMatch = geom.match(/POINT\(([^ ]+) ([^ ]+)\)/)
    if (pointMatch) {
      return [parseFloat(pointMatch[2]), parseFloat(pointMatch[1])] as [number, number]
    }
    
    // Parse POLYGON
    const polygonMatch = geom.match(/POLYGON\(\(([^)]+)\)\)/)
    if (polygonMatch) {
      const coords = polygonMatch[1].split(',').map(pair => {
        const [lng, lat] = pair.trim().split(' ')
        return [parseFloat(lat), parseFloat(lng)] as [number, number]
      })
      return coords.slice(0, -1) 
    }
  }
  
  return []
}
