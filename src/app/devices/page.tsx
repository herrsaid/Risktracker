"use client"

import { useEffect, useState } from "react"
import { fetchDeviceList } from "../../app/actions/device-list"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type Device = {
  DeviceID: string
  DeviceName: string
  Platform?: string
  Edition?: string
  Group?: string
  Active?: string
  TrackerState?: string
  TrackerStateTime?: string
  Battery: string
  BatteryTime: string
  Latitude?: number
  Longitude?: number
  "Altitude(m)"?: string
  Accuracy?: string
  Date?: string
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const data = await fetchDeviceList()
        
        if (data.error) {
          throw new Error(data.error)
        }
        
        if (data.Data && Array.isArray(data.Data)) {
          // Transform and filter data to match Device type
          const transformedDevices: Device[] = data.Data.map((item: any) => ({
            DeviceID: item.DeviceID || '',
            DeviceName: item.DeviceName || '',
            Platform: item.Platform || '',
            Edition: item.Edition || '',
            Group: item.Group || '',
            Active: item.Active || '0',
            TrackerState: item.TrackerState || '0',
            TrackerStateTime: item.TrackerStateTime || '',
            Battery: item.Battery?.toString() || '0',
            BatteryTime: item.BatteryTime || item.Date || new Date().toISOString(),
            Latitude: item.Latitude,
            Longitude: item.Longitude,
            "Altitude(m)": item["Altitude(m)"]?.toString(),
            Accuracy: item.Accuracy?.toString(),
            Date: item.Date
          })).filter(device => device.DeviceID && device.DeviceName) // Filter out invalid devices
          
          setDevices(transformedDevices)
        }
        
        setLoading(false)
      } catch (err) {
        console.error("Error loading devices:", err)
        setError("Failed to load devices")
        setLoading(false)
      }
    }

    loadDevices()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadDevices, 60000)
    return () => clearInterval(interval)
  }, [])

  const getBatteryColor = (battery: string) => {
    const value = parseInt(battery)
    if (isNaN(value)) return "text-gray-600"
    if (value <= 20) return "text-red-600"
    if (value <= 50) return "text-yellow-600"
    return "text-green-600"
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading devices...</div>
          <div className="text-sm text-muted-foreground">Fetching device information</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Devices</h1>
        <p className="text-muted-foreground">
          Manage and monitor all your tracking devices
        </p>
      </div>

      <div className="flex-1 rounded-lg border bg-card">
        <Table>
          <TableCaption>
            Total devices: {devices.length} • Auto-refreshes every 60 seconds
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Device Name</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tracker</TableHead>
              <TableHead>Battery</TableHead>
              <TableHead>Last Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No devices found
                </TableCell>
              </TableRow>
            ) : (
              devices.map((device) => (
                <TableRow key={device.DeviceID}>
                  <TableCell className="font-medium">{device.DeviceName}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {device.DeviceID}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {device.Platform || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {device.Active === "1" ? (
                      <Badge className="bg-green-500 hover:bg-green-500 text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {device.TrackerState === "1" ? (
                      <Badge className="bg-blue-500 hover:bg-blue-500 text-white">Tracking</Badge>
                    ) : (
                      <Badge variant="destructive">Stopped</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${getBatteryColor(device.Battery)}`}>
                      {device.Battery}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {device.BatteryTime ? 
                      new Date(device.BatteryTime).toLocaleString() : 
                      'Never'
                    }
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
