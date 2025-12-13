"use server"

import { supabase } from "@/lib/supabase"

type FollowMeeDevice = {
  DeviceID: string
  DeviceName: string
  Latitude: number
  Longitude: number
  Battery?: number
  "Altitude(m)"?: number
  Accuracy?: number
  Date?: string
}

export async function fetchDeviceList() {
  try {
    
    const response = await fetch(
      "https://www.followmee.com/api/info.aspx?key=079379423eb798f20c1b56cb6ebfb56f&username=saidlam&function=devicelist",
      { cache: "no-store" }
    )

    if (response.ok) {
      const json = await response.json()

      // FollowMee returns { Device: [...] } or similar – adjust if needed
      const devices: FollowMeeDevice[] = Array.isArray(json.Device)
        ? json.Device
        : []

      if (devices.length > 0) {
        // 2) Upsert into Supabase devices table
        const rows = devices.map((d) => ({
          device_id: d.DeviceID,
          name: d.DeviceName,
          // PostGIS point: lng, lat
          location: `SRID=4326;POINT(${d.Longitude} ${d.Latitude})`,
          battery: d.Battery ?? null,
          altitude_m: d["Altitude(m)"] ?? null,
          accuracy_m: d.Accuracy ?? null,
          last_seen: d.Date ? new Date(d.Date).toISOString() : new Date().toISOString(),
        }))

        const { error: upsertError } = await supabase
          .from("devices")
          .upsert(rows, { onConflict: "device_id" })

        if (upsertError) {
          console.error("Error upserting devices:", upsertError)
        }
      }
    } else {
      console.error("FollowMee API error status:", response.status)
    }
  } catch (error) {
    console.error("Error calling FollowMee API:", error)
    // swallow error – will fall back to DB
  }

  // 3) Always return devices from Supabase (fresh if API worked, stale if not)
  try {
    const { data, error } = await supabase
      .from("devices")
      .select(
        `
        device_id,
        name,
        battery,
        altitude_m,
        accuracy_m,
        last_seen,
        location
      `
      )
      .order("last_seen", { ascending: false })

    if (error) {
      console.error("Error fetching devices from DB:", error)
      return { error: "Failed to fetch devices from database" }
    }

    // Map GeoJSON/WKT location into Latitude/Longitude like your frontend expects
    const formatted = (data ?? []).map((row: any) => {
      const loc = row.location
      let lat = 0
      let lng = 0

      if (loc && typeof loc === "object" && loc.type === "Point") {
        // GeoJSON from Supabase
        lng = loc.coordinates[0]
        lat = loc.coordinates[1]
      } else if (typeof loc === "string") {
        // WKT POINT(lng lat)
        const match = loc.match(/POINT\(([^ ]+) ([^ ]+)\)/)
        if (match) {
          lng = parseFloat(match[1])
          lat = parseFloat(match[2])
        }
      }

      return {
        DeviceID: row.device_id,
        DeviceName: row.name,
        Latitude: lat,
        Longitude: lng,
        Battery: row.battery ?? "N/A",
        "Altitude(m)": row.altitude_m ?? 0,
        Accuracy: row.accuracy_m ?? 0,
        Date: row.last_seen,
      }
    })

    // Keep same shape your existing frontend uses
    return { Data: formatted }
  } catch (error) {
    console.error("Unexpected error reading devices:", error)
    return { error: "Failed to fetch devices" }
  }
}
