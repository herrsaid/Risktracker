"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { fetchDevices } from "../../app/actions/devices"


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

type ZoneData = {
  id: string
  name: string
  type: "danger" | "alert"
  shape: "polygon" | "circle"
  coordinates?: [number, number][]
  center?: [number, number]
  radius?: number
}

// Dummy zone data - will be replaced with API later
const DUMMY_ZONES: ZoneData[] = [
  {
    id: "zone1",
    name: "Marrakech Alert Zone",
    type: "alert",
    shape: "circle",
    center: [32.22636, -7.95145],
    radius: 5000,
  },
  {
    id: "zone2",
    name: "City Center Danger Zone",
    type: "danger",
    shape: "polygon",
    coordinates: [
      [32.23, -7.96],
      [32.22, -7.95],
      [32.21, -7.95],
      [32.22, -7.94],
    ],
  },
]

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function LeafletMap() {
  const [devices, setDevices] = useState<DeviceData[]>([])
  const [zones, setZones] = useState<ZoneData[]>([])
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
        
        // Load dummy zones
        setZones(DUMMY_ZONES)
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

  const handleMapClick = (lat: number, lng: number) => {
    console.log("Map clicked at:", lat, lng)
  }

  if (!isMounted) {
    return <div className="h-full w-full bg-muted rounded-lg" />
  }

  if (loading) {
    return (
      <div className="h-full w-full bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading devices...</div>
          <div className="text-sm text-muted-foreground">Fetching GPS data</div>
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
      <MapClickHandler onMapClick={handleMapClick} />

      {/* Render zones */}
      {zones.map((zone) => {
        if (zone.shape === "polygon" && zone.coordinates) {
          return (
            <Polygon
              key={zone.id}
              positions={zone.coordinates}
              pathOptions={{
                color: zone.type === "danger" ? "#dc2626" : "#f59e0b",
                fillColor: zone.type === "danger" ? "#dc2626" : "#f59e0b",
                fillOpacity: 0.3,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{zone.name}</div>
                  <div className="text-muted-foreground">Type: {zone.type}</div>
                </div>
              </Popup>
            </Polygon>
          )
        }

        if (zone.shape === "circle" && zone.center && zone.radius) {
          return (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{
                color: zone.type === "danger" ? "#dc2626" : "#f59e0b",
                fillColor: zone.type === "danger" ? "#dc2626" : "#f59e0b",
                fillOpacity: 0.3,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{zone.name}</div>
                  <div className="text-muted-foreground">Type: {zone.type}</div>
                  <div className="text-muted-foreground">Radius: {zone.radius}m</div>
                </div>
              </Popup>
            </Circle>
          )
        }

        return null
      })}

      {/* Render real device markers */}
      {devices.map((device) => (
        <Marker key={device.id} position={device.position}>
          <Popup>
            <div className="text-sm space-y-1">
              <div className="font-semibold text-base">{device.name}</div>
              <div className="text-muted-foreground">ID: {device.id}</div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Battery:</span>
                <span className={device.battery.includes("15") ? "text-red-600 font-semibold" : "text-green-600"}>
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
