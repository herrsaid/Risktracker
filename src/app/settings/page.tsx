"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getUserSettings, updateUserSettings, resetSettings, UserSettings } from "@/app/actions/settings"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Bell, 
  Shield, 
  Save,
  RotateCcw,
  Settings as SettingsIcon
} from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    user_id: "default-user", // Replace with actual user ID from auth
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    const result = await getUserSettings("default-user") // Replace with actual user ID
    
    if (result.data) {
      setSettings(result.data)
    }
    
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccessMessage(null)

    const result = await updateUserSettings(settings)

    if (result.success) {
      setSuccessMessage("Settings saved successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)
    }

    setSaving(false)
  }

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all settings to defaults?")) return

    setSaving(true)
    const result = await resetSettings("default-user") // Replace with actual user ID

    if (result.success) {
      await loadSettings()
      setSuccessMessage("Settings reset to defaults!")
      setTimeout(() => setSuccessMessage(null), 3000)
    }

    setSaving(false)
  }

  const updateSetting = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg font-semibold">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Manage your account and application preferences
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleReset} variant="outline" disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 gap-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Safety</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={settings.full_name || ""}
                  onChange={(e) => updateSetting("full_name", e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email || ""}
                  onChange={(e) => updateSetting("email", e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.phone || ""}
                  onChange={(e) => updateSetting("phone", e.target.value)}
                  placeholder="+212 6XX XXX XXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={settings.role || "viewer"}
                  onValueChange={(value) => updateSetting("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts via email
                  </p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={settings.email_notifications ?? true}
                  onCheckedChange={(checked) => updateSetting("email_notifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms_notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts via SMS
                  </p>
                </div>
                <Switch
                  id="sms_notifications"
                  checked={settings.sms_notifications ?? false}
                  onCheckedChange={(checked) => updateSetting("sms_notifications", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push_notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications
                  </p>
                </div>
                <Switch
                  id="push_notifications"
                  checked={settings.push_notifications ?? true}
                  onCheckedChange={(checked) => updateSetting("push_notifications", checked)}
                />
              </div>

              <hr className="my-4" />

              <h3 className="font-semibold">Alert Types</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="danger_zone_alerts">Danger Zone Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when devices enter danger zones
                  </p>
                </div>
                <Switch
                  id="danger_zone_alerts"
                  checked={settings.danger_zone_alerts ?? true}
                  onCheckedChange={(checked) => updateSetting("danger_zone_alerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alert_zone_alerts">Alert Zone Warnings</Label>
                  <p className="text-sm text-muted-foreground">
                    Warn when devices enter alert zones
                  </p>
                </div>
                <Switch
                  id="alert_zone_alerts"
                  checked={settings.alert_zone_alerts ?? true}
                  onCheckedChange={(checked) => updateSetting("alert_zone_alerts", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="low_battery_alerts">Low Battery Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when device battery is low
                  </p>
                </div>
                <Switch
                  id="low_battery_alerts"
                  checked={settings.low_battery_alerts ?? true}
                  onCheckedChange={(checked) => updateSetting("low_battery_alerts", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="battery_threshold">
                  Battery Alert Threshold ({settings.battery_threshold || 20}%)
                </Label>
                <Input
                  id="battery_threshold"
                  type="number"
                  min="5"
                  max="50"
                  value={settings.battery_threshold || 20}
                  onChange={(e) => updateSetting("battery_threshold", parseInt(e.target.value))}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Safety Tab */}
        <TabsContent value="safety" className="space-y-4 mt-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Safety Configuration</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="danger_zone_color">Danger Zone Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="danger_zone_color"
                    type="color"
                    value={settings.danger_zone_color || "#dc2626"}
                    onChange={(e) => updateSetting("danger_zone_color", e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={settings.danger_zone_color || "#dc2626"}
                    onChange={(e) => updateSetting("danger_zone_color", e.target.value)}
                    placeholder="#dc2626"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert_zone_color">Alert Zone Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="alert_zone_color"
                    type="color"
                    value={settings.alert_zone_color || "#f59e0b"}
                    onChange={(e) => updateSetting("alert_zone_color", e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={settings.alert_zone_color || "#f59e0b"}
                    onChange={(e) => updateSetting("alert_zone_color", e.target.value)}
                    placeholder="#f59e0b"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_refresh_interval">
                  Auto Refresh Interval ({settings.auto_refresh_interval || 30}s)
                </Label>
                <Input
                  id="auto_refresh_interval"
                  type="number"
                  min="10"
                  max="300"
                  value={settings.auto_refresh_interval || 30}
                  onChange={(e) => updateSetting("auto_refresh_interval", parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  How often to refresh device positions (10-300 seconds)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone_violation_threshold">
                  Zone Violation Threshold ({settings.zone_violation_threshold || 5}s)
                </Label>
                <Input
                  id="zone_violation_threshold"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.zone_violation_threshold || 5}
                  onChange={(e) => updateSetting("zone_violation_threshold", parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Seconds before triggering zone violation alert
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
