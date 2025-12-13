"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Zone } from "@/components/zones/zones-map"
import { Badge } from "@/components/ui/badge"
import { saveZone, fetchZones, deleteZone } from "@/app/actions/zones"
import { Button } from "@/components/ui/button"

const ZonesMap = dynamic(
  () => import("@/components/zones/zones-map").then((m) => m.ZonesMap),
  { 
    ssr: false, 
    loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-lg" /> 
  }
)

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [currentMode, setCurrentMode] = useState<"machine" | "gas">("machine")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    setLoading(true)
    const fetchedZones = await fetchZones()
    setZones(fetchedZones)
    setLoading(false)
  }

  const handleZoneCreated = async (zone: Omit<Zone, "id" | "createdAt">) => {
    const result = await saveZone(zone)
    
    if (result.error) {
      alert('Failed to save zone: ' + result.error)
      return
    }

    await loadZones()
    console.log("Zone saved to database:", result.data)
  }

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this zone?')) return
    
    const result = await deleteZone(zoneId)
    if (result.success) {
      await loadZones()
    } else {
      alert('Failed to delete zone')
    }
  }

  const machineZones = zones.filter(z => z.source === "machine")
  const gasZones = zones.filter(z => z.source === "gas")

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg font-semibold">Loading zones...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full gap-6 p-6 flex-col md:flex-row overflow-auto md:overflow-hidden">
      {/* Left side: Map */}
      <div className="flex-1 flex flex-col gap-4 min-h-[500px] md:min-h-0">
        {/* Mode selector */}
        <div className="flex items-center gap-4 p-4 bg-card border rounded-lg flex-wrap">
          <span className="font-semibold">Zone Type:</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCurrentMode("machine")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                currentMode === "machine"
                  ? "bg-blue-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              🏭 Machine Zone
            </button>
            <button
              onClick={() => setCurrentMode("gas")}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                currentMode === "gas"
                  ? "bg-purple-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              💨 Gas Source
            </button>
          </div>
          <Button onClick={loadZones} variant="outline" className="ml-auto">
            Refresh
          </Button>
        </div>

        <div className="flex-1 min-h-[400px]">
          <ZonesMap
            zones={zones}
            onZoneCreated={handleZoneCreated}
            currentMode={currentMode}
          />
        </div>
      </div>

      {/* Right side: Zones list */}
      <div className="w-full md:w-80 flex flex-col gap-4 md:overflow-y-auto">
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Zones Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Machine Zones:</span>
              <span className="font-semibold">{machineZones.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gas Sources:</span>
              <span className="font-semibold">{gasZones.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-semibold">{zones.length}</span>
            </div>
          </div>
        </div>

        {/* Machine zones list */}
        {machineZones.length > 0 && (
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              🏭 Machine Zones
              <Badge>{machineZones.length}</Badge>
            </h3>
            <div className="space-y-2">
              {machineZones.map((zone) => (
                <div
                  key={zone.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{zone.name}</span>
                    <Button
                      onClick={() => handleDeleteZone(zone.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Shape: {zone.shape}</div>
                    <div className="flex gap-2">
                      <span className="text-red-600">● Danger</span>
                      <span className="text-orange-600">● Alert</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gas source points list */}
        {gasZones.length > 0 && (
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              💨 Gas Sources
              <Badge>{gasZones.length}</Badge>
            </h3>
            <div className="space-y-2">
              {gasZones.map((zone) => (
                <div
                  key={zone.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-sm">{zone.name}</span>
                    <Button
                      onClick={() => handleDeleteZone(zone.id)}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Position: {zone.position[0].toFixed(5)}, {zone.position[1].toFixed(5)}</div>
                    <div className={zone.alertZone ? "text-green-600 font-medium" : "text-muted-foreground italic"}>
                      {zone.alertZone ? '✓ Auto-calculated from weather' : 'Loading weather data...'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info panel */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Zone Types</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium mb-1">🏭 Machine Zone</div>
              <p className="text-xs text-muted-foreground">
                Draw area around machinery. Creates danger (no entry) + alert (caution) zones.
              </p>
            </div>
            <div>
              <div className="font-medium mb-1">💨 Gas Source</div>
              <p className="text-xs text-muted-foreground">
                Click to mark gas leak point. Zones are automatically calculated from real-time wind data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
