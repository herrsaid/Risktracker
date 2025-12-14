"use server"

import { supabase } from "@/lib/supabase"

export type UserSettings = {
  id?: string
  user_id: string
  full_name?: string
  email?: string
  phone?: string
  role?: string
  email_notifications?: boolean
  sms_notifications?: boolean
  push_notifications?: boolean
  danger_zone_alerts?: boolean
  alert_zone_alerts?: boolean
  low_battery_alerts?: boolean
  battery_threshold?: number
  theme?: string
  language?: string
  units?: string
  map_style?: string
  danger_zone_color?: string
  alert_zone_color?: string
  auto_refresh_interval?: number
  zone_violation_threshold?: number
}

// Get user settings
export async function getUserSettings(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found
      console.error("Error fetching settings:", error)
      return { error: error.message }
    }

    // If no settings found, return defaults
    if (!data) {
      return {
        data: {
          user_id: userId,
          email_notifications: true,
          sms_notifications: false,
          push_notifications: true,
          danger_zone_alerts: true,
          alert_zone_alerts: true,
          low_battery_alerts: true,
          battery_threshold: 20,
          theme: "light",
          language: "en",
          units: "metric",
          map_style: "default",
          danger_zone_color: "#dc2626",
          alert_zone_color: "#f59e0b",
          auto_refresh_interval: 30,
          zone_violation_threshold: 5,
        },
      }
    }

    return { data }
  } catch (error) {
    console.error("Error in getUserSettings:", error)
    return { error: "Failed to fetch settings" }
  }
}

// Update user settings
export async function updateUserSettings(settings: UserSettings) {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single()

    if (error) {
      console.error("Error updating settings:", error)
      return { error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error in updateUserSettings:", error)
    return { error: "Failed to update settings" }
  }
}

// Reset settings to defaults
export async function resetSettings(userId: string) {
  try {
    const { error } = await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", userId)

    if (error) {
      console.error("Error resetting settings:", error)
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in resetSettings:", error)
    return { error: "Failed to reset settings" }
  }
}
