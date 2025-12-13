"use server"

import { supabase } from "@/lib/supabase"

type FollowMeeTrack = {
  DeviceID: string
  DeviceName: string
  Latitude: number
  Longitude: number
  Battery?: number
  "Altitude(m)"?: number
  Accuracy?: number
  Date?: string
}

export async function fetchDevices() {
  try {
    const response = await fetch(
      "https://www.followmee.com/api/tracks.aspx?key=079379423eb798f20c1b56cb6ebfb56f&username=saidlam&output=json&function=currentforalldevices",
      { cache: "no-store" }
    )

    if (response.ok) {
      const json = await response.json()

      
      const tracks: FollowMeeTrack[] = Array.isArray(json.Data)
        ? json.Data
        : Array.isArray(json.Device)
        ? json.Device
        : []

      if (tracks.length > 0) {
        const rows = tracks.map((t) => ({
          device_id: t.DeviceID,
          name: t.DeviceName,
          location: `SRID=4326;POINT(${t.Longitude} ${t.Latitude})`,
          battery: t.Battery ?? null,
          altitude_m: t["Altitude(m)"] ?? null,
          accuracy_m: t.Accuracy ?? null,
          last_seen: t.Date
            ? new Date(t.Date).toISOString()
            : new Date().toISOString(),
        }))

        const { error: upsertError } = await supabase
          .from("devices")
          .upsert(rows, { onConflict: "device_id" })

        if (upsertError) {
          console.error("Error upserting device tracks:", upsertError)
        }
      }
    } else {
      console.error("FollowMee tracks API status:", response.status)
    }
  } catch (error) {
    console.error("Error calling FollowMee tracks API:", error)
  }

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

    const formatted = (data ?? []).map((row: any) => {
      const loc = row.location
      let lat = 0
      let lng = 0

      if (loc && typeof loc === "object" && loc.type === "Point") {
        // GeoJSON from Supabase
        lng = loc.coordinates[0]
        lat = loc.coordinates[1]
      } else if (typeof loc === "string") {
        // WKT `POINT(lng lat)`
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

    return { Data: formatted }
  } catch (error) {
    console.error("Unexpected error reading devices from DB:", error)
    return { error: "Failed to fetch" }
  }
}
