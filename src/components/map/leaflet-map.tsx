"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMapEvents } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix default marker icons in Next.js
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
  status: "active" | "inactive"
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


const DUMMY_DEVICES: DeviceData[] = [
  { id: "dev1", position: [40.7128, -74.0060], name: "Device NYC", status: "active" },
  { id: "dev2", position: [51.5074, -0.1278], name: "Device London", status: "active" },
  { id: "dev3", position: [35.6762, 139.6503], name: "Device Tokyo", status: "inactive" },
  { id: "dev4", position: [48.8566, 2.3522], name: "Device Paris", status: "active" },
  { id: "dev5", position: [-33.8688, 151.2093], name: "Device Sydney", status: "active" },
  { id: "dev6", position: [37.7749, -122.4194], name: "Device SF", status: "inactive" },
]

const DUMMY_ZONES: ZoneData[] = [
  {
    id: "zone1",
    name: "NYC Danger Zone",
    type: "danger",
    shape: "circle",
    center: [40.7128, -74.0060], // Device NYC position
    radius: 8000, // 8km radius
  },
  {
    id: "zone2",
    name: "London Alert Zone",
    type: "alert",
    shape: "circle",
    center: [51.5074, -0.1278], // Device London position
    radius: 10000, // 10km radius
  },
  {
    id: "zone3",
    name: "Tokyo Danger Zone",
    type: "danger",
    shape: "polygon",
    coordinates: [
      [35.69, 139.64],  // Around Device Tokyo
      [35.68, 139.66],
      [35.66, 139.65],
      [35.67, 139.63],
    ],
  },
  {
    id: "zone4",
    name: "Paris Alert Zone",
    type: "alert",
    shape: "circle",
    center: [48.8566, 2.3522], // Device Paris position
    radius: 5000, // 5km radius
  },
  {
    id: "zone5",
    name: "SF Danger Zone",
    type: "danger",
    shape: "polygon",
    coordinates: [
      [37.78, -122.43],  // Around Device SF
      [37.77, -122.41],
      [37.76, -122.42],
      [37.77, -122.44],
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

  useEffect(() => {
    setIsMounted(true)
    // Load dummy data - later replace with API calls
    setDevices(DUMMY_DEVICES)
    setZones(DUMMY_ZONES)
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    const newDevice: DeviceData = {
      id: `dev-${Date.now()}`,
      position: [lat, lng],
      name: `Device ${devices.length + 1}`,
      status: "active",
    }
    setDevices([...devices, newDevice])
    console.log("Device added:", lat, lng)
  }

  if (!isMounted) {
    return <div className="h-full w-full bg-muted rounded-lg" />
  }

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
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

      {/* Render device markers */}
      {devices.map((device) => (
        <Marker key={device.id} position={device.position}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{device.name}</div>
              <div className="text-muted-foreground">ID: {device.id}</div>
              <div className={device.status === "active" ? "text-green-600" : "text-gray-500"}>
                Status: {device.status}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
