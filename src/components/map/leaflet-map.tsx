"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { fetchDevices } from "@/app/actions/devices"
import { Zone, MachineZone, GasSourcePoint } from "@/components/zones/zones-map"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

type DeviceData = {
  id: string
  position: [number, number]
  name: string
  date: string
  battery: string
  altitude: number
  accuracy: number
}

type LeafletMapProps = {
  zones: Zone[]
}

export function LeafletMap({ zones }: LeafletMapProps) {
  const [devices, setDevices] = useState<DeviceData[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
    
    // Fetch devices using Server Action
    const loadDevices = async () => {
      try {
        const data = await fetchDevices()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        if (data.Data && Array.isArray(data.Data)) {
          const formattedDevices: DeviceData[] = data.Data.map((device: any) => ({
            id: device.DeviceID,
            position: [device.Latitude, device.Longitude] as [number, number],
            name: device.DeviceName,
            date: device.Date,
            battery: device.Battery || "N/A",
            altitude: device["Altitude(m)"] || 0,
            accuracy: device.Accuracy || 0,
          }))
          
          setDevices(formattedDevices)
          console.log("Devices loaded:", formattedDevices)
        }
        
        setLoading(false)
      } catch (err) {
        console.error("Error loading devices:", err)
        setError("Failed to load devices")
        setLoading(false)
      }
    }

    loadDevices()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDevices, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!isMounted) {
    return <div className="h-full w-full bg-muted rounded-lg" />
  }

  if (loading) {
    return (
      <div className="h-full w-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading map data...</div>
          <div className="text-sm text-muted-foreground">Fetching devices and zones</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  // Center map on first device if available
  const mapCenter: [number, number] = devices.length > 0 
    ? devices[0].position 
    : [32.22636, -7.95145]

  return (
    <MapContainer
      center={mapCenter}
      zoom={12}
      preferCanvas={true}
      className="h-full w-full rounded-lg border"
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        keepBuffer={2}
        updateWhenIdle={false}
        updateWhenZooming={false}
      />

      {/* Render zones from database */}
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
                      <div className="text-red-600 font-semibold">⚠️ Danger Zone - No Entry</div>
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
                      <div className="text-red-600 font-semibold">⚠️ Danger Zone - No Entry</div>
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
                      <div className="text-orange-600 font-semibold">⚠️ Alert Zone - Caution</div>
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
                      <div className="text-orange-600 font-semibold">⚠️ Alert Zone - Caution</div>
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
                    {gasZone.dangerZoneCircle ? (
                      <div className="text-green-600 text-xs font-medium">✓ Wind zones calculated</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Wind-based zones pending
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Wind-calculated danger zone (circle) */}
              {gasZone.dangerZoneCircle && (
                <Circle
                  center={gasZone.dangerZoneCircle.center}
                  radius={gasZone.dangerZoneCircle.radius}
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
                      <div className="text-red-600 font-semibold">💨 Gas Danger Zone</div>
                      <div className="text-muted-foreground">
                        Radius: {Math.round(gasZone.dangerZoneCircle.radius)}m
                      </div>
                      <div className="text-xs text-muted-foreground">Wind-calculated</div>
                    </div>
                  </Popup>
                </Circle>
              )}

              {/* Wind-calculated alert zone (plume polygon) */}
              {gasZone.alertZone && gasZone.alertZone.coordinates && (
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
                      <div className="text-orange-600 font-semibold">💨 Gas Alert Zone</div>
                      <div className="text-xs text-muted-foreground">Wind-driven plume (8km)</div>
                    </div>
                  </Popup>
                </Polygon>
              )}
            </div>
          )
        }

        return null
      })}

      {/* Render real device markers on top of zones */}
      {devices.map((device) => (
        <Marker key={device.id} position={device.position}>
          <Popup>
            <div className="text-sm space-y-1">
              <div className="font-semibold text-base">{device.name}</div>
              <div className="text-muted-foreground">ID: {device.id}</div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Battery:</span>
                <span className={device.battery.includes("15") || device.battery.includes("30") ? "text-red-600 font-semibold" : "text-green-600"}>
                  {device.battery}
                </span>
              </div>
              <div className="text-muted-foreground">Altitude: {device.altitude}m</div>
              <div className="text-muted-foreground">Accuracy: {device.accuracy}m</div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(device.date).toLocaleString()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
