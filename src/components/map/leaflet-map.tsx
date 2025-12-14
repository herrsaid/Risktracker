"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { fetchDevices } from "@/app/actions/devices"
import { Zone, MachineZone, GasSourcePoint } from "@/components/zones/zones-map"
import { distanceMeters, pointInPolygon } from "@/lib/geo"
import { logDeviceHistory, logZoneViolation, updateViolationExit } from "@/app/actions/analytics"

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

export type DeviceData = {
  id: string
  position: [number, number]
  name: string
  date: string
  battery: string
  altitude: number
  accuracy: number
  inDanger?: boolean
  inAlert?: boolean
  violatingZone?: {
    id: string
    name: string
    type: "danger" | "alert"
    source: "machine" | "gas"
  }
}

type LeafletMapProps = {
  zones: Zone[]
  onDangerStatusChange?: (status: {
    anyInDanger: boolean
    anyInAlert: boolean
    dangerDevices: DeviceData[]
    alertDevices: DeviceData[]
  }) => void
}

// Track active violations for each device
const activeViolations = new Map<string, { violationId: string; zoneId: string; type: "danger" | "alert" }>()

function computeDeviceZoneStatus(
  device: DeviceData,
  zones: Zone[]
): { 
  inDanger: boolean
  inAlert: boolean
  violatingZone?: {
    id: string
    name: string
    type: "danger" | "alert"
    source: "machine" | "gas"
  }
} {
  let inDanger = false
  let inAlert = false
  let violatingZone: {
    id: string
    name: string
    type: "danger" | "alert"
    source: "machine" | "gas"
  } | undefined

  for (const zone of zones) {
    if (zone.source === "machine") {
      const z = zone as MachineZone

      if (z.shape === "polygon") {
        if (z.dangerZone.coordinates && pointInPolygon(device.position, z.dangerZone.coordinates)) {
          inDanger = true
          violatingZone = {
            id: zone.id,
            name: zone.name,
            type: "danger",
            source: "machine",
          }
          break // Danger overrides everything
        }
        if (!inDanger && z.alertZone.coordinates && pointInPolygon(device.position, z.alertZone.coordinates)) {
          inAlert = true
          violatingZone = {
            id: zone.id,
            name: zone.name,
            type: "alert",
            source: "machine",
          }
        }
      } else if (z.shape === "circle") {
        if (z.dangerZone.center && z.dangerZone.radius) {
          const d = distanceMeters(device.position, z.dangerZone.center)
          if (d <= z.dangerZone.radius) {
            inDanger = true
            violatingZone = {
              id: zone.id,
              name: zone.name,
              type: "danger",
              source: "machine",
            }
            break
          }
        }
        if (!inDanger && z.alertZone.center && z.alertZone.radius) {
          const d = distanceMeters(device.position, z.alertZone.center)
          if (d <= z.alertZone.radius) {
            inAlert = true
            violatingZone = {
              id: zone.id,
              name: zone.name,
              type: "alert",
              source: "machine",
            }
          }
        }
      }
    }

    if (zone.source === "gas") {
      const gz = zone as GasSourcePoint

      // Gas danger circle
      if (gz.dangerZoneCircle) {
        const d = distanceMeters(device.position, gz.dangerZoneCircle.center)
        if (d <= gz.dangerZoneCircle.radius) {
          inDanger = true
          violatingZone = {
            id: zone.id,
            name: zone.name,
            type: "danger",
            source: "gas",
          }
          break
        }
      }

      // Gas alert plume polygon
      if (!inDanger && gz.alertZone?.coordinates && pointInPolygon(device.position, gz.alertZone.coordinates)) {
        inAlert = true
        violatingZone = {
          id: zone.id,
          name: zone.name,
          type: "alert",
          source: "gas",
        }
      }
    }
  }

  // Danger overrides alert
  if (inDanger) inAlert = false

  return { inDanger, inAlert, violatingZone }
}

async function trackZoneViolations(devices: DeviceData[]) {
  for (const device of devices) {
    const deviceKey = device.id
    const activeViolation = activeViolations.get(deviceKey)

    if (device.violatingZone) {
      // Device is in a zone
      if (!activeViolation || activeViolation.zoneId !== device.violatingZone.id) {
        // New violation - log it
        const result = await logZoneViolation({
          device_id: device.id,
          device_name: device.name,
          zone_id: device.violatingZone.id,
          zone_name: device.violatingZone.name,
          zone_type: device.violatingZone.type,
          zone_source: device.violatingZone.source,
          latitude: device.position[0],
          longitude: device.position[1],
        })

        if (result.success && result.data) {
          // If there was a previous violation for a different zone, close it
          if (activeViolation) {
            await updateViolationExit(activeViolation.violationId)
          }

          // Store the new violation ID
          activeViolations.set(deviceKey, {
            violationId: result.data.id,
            zoneId: device.violatingZone.id,
            type: device.violatingZone.type,
          })

          console.log(`New violation logged: ${device.name} entered ${device.violatingZone.name}`)
        }
      }
      // If already in violation for this zone, do nothing (ongoing violation)
    } else {
      // Device is not in any zone
      if (activeViolation) {
        // Device exited the zone - update the violation
        await updateViolationExit(activeViolation.violationId)
        activeViolations.delete(deviceKey)
        console.log(`Violation ended: ${device.name} exited zone`)
      }
    }
  }
}

export function LeafletMap({ zones, onDangerStatusChange }: LeafletMapProps) {
  const [devices, setDevices] = useState<DeviceData[]>([])
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)

    const loadDevices = async () => {
      try {
        const data = await fetchDevices()
        if (data.error) {
          throw new Error(data.error)
        }

        if (data.Data && Array.isArray(data.Data)) {
          const baseDevices: DeviceData[] = data.Data.map((device: any) => ({
            id: device.DeviceID,
            position: [device.Latitude, device.Longitude] as [number, number],
            name: device.DeviceName,
            date: device.Date,
            battery: device.Battery || "N/A",
            altitude: device["Altitude(m)"] || 0,
            accuracy: device.Accuracy || 0,
          }))

          // Compute zone status for each device
          const withStatus = baseDevices.map((d) => {
            const { inDanger, inAlert, violatingZone } = computeDeviceZoneStatus(d, zones)
            return { ...d, inDanger, inAlert, violatingZone }
          })

          setDevices(withStatus)

          // Log device history for analytics
          await logDeviceHistory(
            withStatus.map((d) => ({
              device_id: d.id,
              device_name: d.name,
              latitude: d.position[0],
              longitude: d.position[1],
              battery: d.battery !== "N/A" ? parseInt(d.battery) : undefined,
              altitude_m: d.altitude,
              accuracy_m: d.accuracy,
              timestamp: new Date(d.date),
            }))
          )

          // Track zone violations
          await trackZoneViolations(withStatus)

          const dangerDevices = withStatus.filter((d) => d.inDanger)
          const alertDevices = withStatus.filter((d) => d.inAlert && !d.inDanger)

          const anyInDanger = dangerDevices.length > 0
          const anyInAlert = alertDevices.length > 0

          onDangerStatusChange?.({
            anyInDanger,
            anyInAlert,
            dangerDevices,
            alertDevices,
          })

          console.log("Devices loaded and tracked:", withStatus.length)
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
  }, [zones])

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

  const mapCenter: [number, number] =
    devices.length > 0 ? devices[0].position : [32.22636, -7.95145]

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

      {/* Render zones */}
      {zones.map((zone) => {
        if (zone.source === "machine") {
          const machineZone = zone as MachineZone

          return (
            <div key={zone.id}>
              {/* Danger zone */}
              {machineZone.shape === "polygon" &&
                machineZone.dangerZone.coordinates && (
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
                        <div className="font-semibold text-base">
                          {machineZone.name}
                        </div>
                        <div className="text-red-600 font-semibold">
                          ⚠️ Danger Zone - No Entry
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Machine area
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                )}

              {machineZone.shape === "circle" &&
                machineZone.dangerZone.center &&
                machineZone.dangerZone.radius && (
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
                        <div className="font-semibold text-base">
                          {machineZone.name}
                        </div>
                        <div className="text-red-600 font-semibold">
                          ⚠️ Danger Zone - No Entry
                        </div>
                        <div className="text-muted-foreground">
                          Radius: {Math.round(machineZone.dangerZone.radius)}m
                        </div>
                      </div>
                    </Popup>
                  </Circle>
                )}

              {/* Alert zone */}
              {machineZone.shape === "polygon" &&
                machineZone.alertZone.coordinates && (
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
                        <div className="font-semibold text-base">
                          {machineZone.name}
                        </div>
                        <div className="text-orange-600 font-semibold">
                          ⚠️ Alert Zone - Caution
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Surrounding area
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                )}

              {machineZone.shape === "circle" &&
                machineZone.alertZone.center &&
                machineZone.alertZone.radius && (
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
                        <div className="font-semibold text-base">
                          {machineZone.name}
                        </div>
                        <div className="text-orange-600 font-semibold">
                          ⚠️ Alert Zone - Caution
                        </div>
                        <div className="text-muted-foreground">
                          Radius: {Math.round(machineZone.alertZone.radius)}m
                        </div>
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
                      <div className="text-green-600 text-xs font-medium">
                        ✓ Wind zones calculated
                      </div>
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
                      <div className="font-semibold text-base">
                        {gasZone.name}
                      </div>
                      <div className="text-red-600 font-semibold">
                        💨 Gas Danger Zone
                      </div>
                      <div className="text-muted-foreground">
                        Radius: {Math.round(gasZone.dangerZoneCircle.radius)}m
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Wind-calculated
                      </div>
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
                      <div className="font-semibold text-base">
                        {gasZone.name}
                      </div>
                      <div className="text-orange-600 font-semibold">
                        💨 Gas Alert Zone
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Wind-driven plume (8km)
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              )}
            </div>
          )
        }

        return null
      })}

      {/* Device markers with zone status */}
      {devices.map((device) => {
        const zoneLabel = device.inDanger
          ? "INSIDE DANGER ZONE"
          : device.inAlert
          ? "Inside alert zone"
          : null

        const zoneColor = device.inDanger
          ? "text-red-600"
          : device.inAlert
          ? "text-orange-500"
          : "text-muted-foreground"

        return (
          <Marker key={device.id} position={device.position}>
            <Popup>
              <div className="text-sm space-y-1">
                <div className="font-semibold text-base">{device.name}</div>
                <div className="text-muted-foreground">ID: {device.id}</div>

                {zoneLabel && (
                  <div className={`${zoneColor} font-semibold`}>{zoneLabel}</div>
                )}

                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Battery:</span>
                  <span className="text-black-600">
                    {device.battery}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Altitude: {device.altitude}m
                </div>
                <div className="text-muted-foreground">
                  Accuracy: {device.accuracy}m
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(device.date).toLocaleString()}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
