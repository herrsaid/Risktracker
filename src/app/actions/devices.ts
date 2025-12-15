"use server"

import { supabase } from "@/lib/supabase"

export async function fetchDevices() {
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
