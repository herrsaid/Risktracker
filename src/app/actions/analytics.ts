"use server"

import { supabase } from "@/lib/supabase"

// Log device position to history
export async function logDeviceHistory(devices: {
  device_id: string
  device_name: string
  latitude: number
  longitude: number
  battery?: number
  altitude_m?: number
  accuracy_m?: number
  timestamp?: Date
}[]) {
  try {
    const rows = devices.map((d) => ({
      device_id: d.device_id,
      device_name: d.device_name,
      location: `SRID=4326;POINT(${d.longitude} ${d.latitude})`,
      battery: d.battery ?? null,
      altitude_m: d.altitude_m ?? null,
      accuracy_m: d.accuracy_m ?? null,
      timestamp: d.timestamp ? d.timestamp.toISOString() : new Date().toISOString(),
    }))

    const { error } = await supabase.from("device_history").insert(rows)

    if (error) {
      console.error("Error logging device history:", error)
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in logDeviceHistory:", error)
    return { error: "Failed to log device history" }
  }
}

// Log zone violation
export async function logZoneViolation(violation: {
  device_id: string
  device_name: string
  zone_id: string
  zone_name: string
  zone_type: "danger" | "alert"
  zone_source: "machine" | "gas"
  latitude: number
  longitude: number
}) {
  try {
    const { data, error } = await supabase
      .from("zone_violations")
      .insert({
        device_id: violation.device_id,
        device_name: violation.device_name,
        zone_id: violation.zone_id,
        zone_name: violation.zone_name,
        zone_type: violation.zone_type,
        zone_source: violation.zone_source,
        location: `SRID=4326;POINT(${violation.longitude} ${violation.latitude})`,
        entered_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error logging zone violation:", error)
      return { error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in logZoneViolation:", error)
    return { error: "Failed to log zone violation" }
  }
}

// Update violation exit time
export async function updateViolationExit(violationId: string) {
  try {
    const exitTime = new Date()
    
    // Get the violation to calculate duration
    const { data: violation } = await supabase
      .from("zone_violations")
      .select("entered_at")
      .eq("id", violationId)
      .single()

    if (violation) {
      const enteredAt = new Date(violation.entered_at)
      const durationSeconds = Math.floor((exitTime.getTime() - enteredAt.getTime()) / 1000)

      const { error } = await supabase
        .from("zone_violations")
        .update({
          exited_at: exitTime.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", violationId)

      if (error) {
        console.error("Error updating violation exit:", error)
        return { error: error.message }
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in updateViolationExit:", error)
    return { error: "Failed to update violation exit" }
  }
}

// Get device history for a date range
export async function getDeviceHistory(
  deviceId?: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    let query = supabase
      .from("device_history")
      .select("*")
      .order("timestamp", { ascending: false })

    if (deviceId) {
      query = query.eq("device_id", deviceId)
    }

    if (startDate) {
      query = query.gte("timestamp", startDate.toISOString())
    }

    if (endDate) {
      query = query.lte("timestamp", endDate.toISOString())
    }

    const { data, error } = await query.limit(1000)

    if (error) {
      console.error("Error fetching device history:", error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error("Error in getDeviceHistory:", error)
    return { error: "Failed to fetch device history" }
  }
}

// Get zone violations
export async function getZoneViolations(
  startDate?: Date,
  endDate?: Date,
  zoneType?: "danger" | "alert"
) {
  try {
    let query = supabase
      .from("zone_violations")
      .select("*")
      .order("entered_at", { ascending: false })

    if (startDate) {
      query = query.gte("entered_at", startDate.toISOString())
    }

    if (endDate) {
      query = query.lte("entered_at", endDate.toISOString())
    }

    if (zoneType) {
      query = query.eq("zone_type", zoneType)
    }

    const { data, error } = await query.limit(500)

    if (error) {
      console.error("Error fetching zone violations:", error)
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error("Error in getZoneViolations:", error)
    return { error: "Failed to fetch zone violations" }
  }
}

// Get analytics summary
export async function getAnalyticsSummary(startDate: Date, endDate: Date) {
  try {
    const { data: violations, error: violationsError } = await supabase
      .from("zone_violations")
      .select("*")
      .gte("entered_at", startDate.toISOString())
      .lte("entered_at", endDate.toISOString())

    if (violationsError) {
      console.error("Error fetching violations for summary:", violationsError)
      return { error: violationsError.message }
    }

    const totalViolations = violations?.length || 0
    const dangerViolations = violations?.filter((v) => v.zone_type === "danger").length || 0
    const alertViolations = violations?.filter((v) => v.zone_type === "alert").length || 0

    // Get unique devices tracked
    const { data: history, error: historyError } = await supabase
      .from("device_history")
      .select("device_id")
      .gte("timestamp", startDate.toISOString())
      .lte("timestamp", endDate.toISOString())

    if (historyError) {
      console.error("Error fetching history for summary:", historyError)
    }

    const uniqueDevices = new Set(history?.map((h) => h.device_id) || []).size

    // Get average battery level
    const { data: batteryData } = await supabase
      .from("device_history")
      .select("battery")
      .gte("timestamp", startDate.toISOString())
      .lte("timestamp", endDate.toISOString())
      .not("battery", "is", null)

    const avgBattery = batteryData && batteryData.length > 0
      ? batteryData.reduce((sum, d) => sum + (d.battery || 0), 0) / batteryData.length
      : 0

    return {
      data: {
        totalViolations,
        dangerViolations,
        alertViolations,
        totalDevicesTracked: uniqueDevices,
        avgBatteryLevel: Math.round(avgBattery),
      },
    }
  } catch (error) {
    console.error("Error in getAnalyticsSummary:", error)
    return { error: "Failed to fetch analytics summary" }
  }
}
