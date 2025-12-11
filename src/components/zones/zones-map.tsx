"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Polygon, Circle, Popup, Marker, useMapEvents } from "react-leaflet"
import { DrawControl } from "./draw-control"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

export type ZoneSource = "machine" | "gas"
export type ZoneLevel = "danger" | "alert"

export type MachineZone = {
  id: string
  name: string
  source: "machine"
  shape: "polygon" | "circle"
  dangerZone: {
    coordinates?: [number, number][]
    center?: [number, number]
    radius?: number
  }
  alertZone: {
    coordinates?: [number, number][]
    center?: [number, number]
    radius?: number
  }
  createdAt: string
}

export type GasSourcePoint = {
  id: string
  name: string
  source: "gas"
  position: [number, number]
  // Wind data will be used to calculate zones later
  dangerZone?: {
    coordinates: [number, number][]
  }
  alertZone?: {
    coordinates: [number, number][]
  }
  createdAt: string
}

export type Zone = MachineZone | GasSourcePoint

type ZonesMapProps = {
  zones: Zone[]
  onZoneCreated: (zone: Omit<Zone, "id" | "createdAt">) => void
  currentMode: "machine" | "gas"
}

function MapClickHandler({ 
  onMapClick, 
  enabled 
}: { 
  onMapClick: (lat: number, lng: number) => void
  enabled: boolean
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export function ZonesMap({ zones, onZoneCreated, currentMode }: ZonesMapProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleCreated = (e: any) => {
    const { layerType, layer } = e
    
    if (layerType === "polygon" || layerType === "rectangle") {
      const latLngs = layer.getLatLngs()[0]
      const coordinates: [number, number][] = latLngs.map((ll: L.LatLng) => [ll.lat, ll.lng])
      
      // Create machine zone with both danger and alert areas
      const newZone: Omit<MachineZone, "id" | "createdAt"> = {
        name: `Machine Zone ${zones.length + 1}`,
        source: "machine",
        shape: "polygon",
        dangerZone: {
          coordinates,
        },
        alertZone: {
          // Create alert zone by expanding coordinates (simplified - can be improved)
          coordinates: coordinates.map(([lat, lng]) => [lat + 0.001, lng + 0.001] as [number, number]),
        },
      }
      onZoneCreated(newZone)
      
    } else if (layerType === "circle") {
      const center = layer.getLatLng()
      const radius = layer.getRadius()
      
      // Create machine zone with both danger and alert circles
      const newZone: Omit<MachineZone, "id" | "createdAt"> = {
        name: `Machine Zone ${zones.length + 1}`,
        source: "machine",
        shape: "circle",
        dangerZone: {
          center: [center.lat, center.lng],
          radius,
        },
        alertZone: {
          center: [center.lat, center.lng],
          radius: radius * 1.5, // Alert zone is 1.5x larger
        },
      }
      onZoneCreated(newZone)
    }
  }

  const handleGasPointClick = (lat: number, lng: number) => {
    if (currentMode === "gas") {
      const newZone: Omit<GasSourcePoint, "id" | "createdAt"> = {
        name: `Gas Source ${zones.filter(z => z.source === "gas").length + 1}`,
        source: "gas",
        position: [lat, lng],
        // Wind calculation will add zones later
      }
      onZoneCreated(newZone)
    }
  }

  if (!isMounted) {
    return <div className="h-full w-full bg-muted rounded-lg" />
  }

  return (
    <div className="h-full w-full flex flex-col gap-4">
      {/* Instructions based on mode */}
      <div className="p-4 bg-card border rounded-lg">
        {currentMode === "machine" ? (
          <div className="space-y-2">
            <div className="font-semibold text-lg">🏭 Machine Zone Mode</div>
            <p className="text-sm text-muted-foreground">
              Use the drawing tools on the right to draw a polygon, rectangle, or circle around the machine.
              This will create both a <span className="text-red-600 font-semibold">danger zone</span> (no entry) and an <span className="text-orange-600 font-semibold">alert zone</span> (caution).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="font-semibold text-lg">💨 Gas Source Mode</div>
            <p className="text-sm text-muted-foreground">
              Click anywhere on the map to mark a gas source location.
              Danger and alert zones will be calculated automatically based on wind direction and speed (coming soon).
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 rounded-lg border overflow-hidden">
        <MapContainer
          center={[32.22636, -7.95145]}
          zoom={12}
          preferCanvas={true}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {currentMode === "machine" && (
            <DrawControl onCreated={handleCreated} currentZoneType="danger" />
          )}

          {currentMode === "gas" && (
            <MapClickHandler onMapClick={handleGasPointClick} enabled={true} />
          )}

          {/* Render existing zones */}
          {zones.map((zone) => {
            if (zone.source === "machine") {
              const machineZone = zone as MachineZone
              
              return (
                <div key={zone.id}>
                  {/* Danger zone */}
                  {machineZone.shape === "polygon" && machineZone.dangerZone.coordinates && (
                    <Polygon
                      positions={machineZone.dangerZone.coordinates}
                      pathOptions={{
                        color: "#dc2626",
                        fillColor: "#dc2626",
                        fillOpacity: 0.3,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-base">{machineZone.name}</div>
                          <div className="text-red-600 font-semibold">Danger Zone - No Entry</div>
                          <div className="text-xs text-muted-foreground">Machine area</div>
                        </div>
                      </Popup>
                    </Polygon>
                  )}
                  
                  {machineZone.shape === "circle" && machineZone.dangerZone.center && machineZone.dangerZone.radius && (
                    <Circle
                      center={machineZone.dangerZone.center}
                      radius={machineZone.dangerZone.radius}
                      pathOptions={{
                        color: "#dc2626",
                        fillColor: "#dc2626",
                        fillOpacity: 0.3,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-base">{machineZone.name}</div>
                          <div className="text-red-600 font-semibold">Danger Zone - No Entry</div>
                          <div className="text-muted-foreground">Radius: {Math.round(machineZone.dangerZone.radius)}m</div>
                        </div>
                      </Popup>
                    </Circle>
                  )}

                  {/* Alert zone */}
                  {machineZone.shape === "polygon" && machineZone.alertZone.coordinates && (
                    <Polygon
                      positions={machineZone.alertZone.coordinates}
                      pathOptions={{
                        color: "#f59e0b",
                        fillColor: "#f59e0b",
                        fillOpacity: 0.2,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-base">{machineZone.name}</div>
                          <div className="text-orange-600 font-semibold">Alert Zone - Caution</div>
                          <div className="text-xs text-muted-foreground">Surrounding area</div>
                        </div>
                      </Popup>
                    </Polygon>
                  )}
                  
                  {machineZone.shape === "circle" && machineZone.alertZone.center && machineZone.alertZone.radius && (
                    <Circle
                      center={machineZone.alertZone.center}
                      radius={machineZone.alertZone.radius}
                      pathOptions={{
                        color: "#f59e0b",
                        fillColor: "#f59e0b",
                        fillOpacity: 0.2,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-base">{machineZone.name}</div>
                          <div className="text-orange-600 font-semibold">Alert Zone - Caution</div>
                          <div className="text-muted-foreground">Radius: {Math.round(machineZone.alertZone.radius)}m</div>
                        </div>
                      </Popup>
                    </Circle>
                  )}
                </div>
              )
            }

            if (zone.source === "gas") {
              const gasZone = zone as GasSourcePoint
              
              return (
                <div key={zone.id}>
                  {/* Gas source marker */}
                  <Marker position={gasZone.position}>
                    <Popup>
                      <div className="text-sm space-y-1">
                        <div className="font-semibold text-base">{gasZone.name}</div>
                        <div className="text-muted-foreground">💨 Gas Source Point</div>
                        <div className="text-xs text-muted-foreground">
                          Wind-based zones will be calculated
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Wind-calculated danger zone (if exists) */}
                  {gasZone.dangerZone && (
                    <Polygon
                      positions={gasZone.dangerZone.coordinates}
                      pathOptions={{
                        color: "#dc2626",
                        fillColor: "#dc2626",
                        fillOpacity: 0.3,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-base">{gasZone.name}</div>
                          <div className="text-red-600 font-semibold">Gas Danger Zone</div>
                          <div className="text-xs text-muted-foreground">Wind-calculated</div>
                        </div>
                      </Popup>
                    </Polygon>
                  )}

                  {/* Wind-calculated alert zone (if exists) */}
                  {gasZone.alertZone && (
                    <Polygon
                      positions={gasZone.alertZone.coordinates}
                      pathOptions={{
                        color: "#f59e0b",
                        fillColor: "#f59e0b",
                        fillOpacity: 0.2,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold text-base">{gasZone.name}</div>
                          <div className="text-orange-600 font-semibold">Gas Alert Zone</div>
                          <div className="text-xs text-muted-foreground">Wind-calculated</div>
                        </div>
                      </Popup>
                    </Polygon>
                  )}
                </div>
              )
            }

            return null
          })}
        </MapContainer>
      </div>
    </div>
  )
}
