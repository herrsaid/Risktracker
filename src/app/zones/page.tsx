"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Zone } from "@/components/zones/zones-map"
import { Badge } from "@/components/ui/badge"

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

  const handleZoneCreated = (zone: Omit<Zone, "id" | "createdAt">) => {
    const newZone: Zone = {
      ...zone,
      id: `zone-${Date.now()}`,
      createdAt: new Date().toISOString(),
    } as Zone
    setZones([...zones, newZone])
    console.log("Zone created:", newZone)
    // Later: Save to database/API
  }

  const machineZones = zones.filter(z => z.source === "machine")
  const gasZones = zones.filter(z => z.source === "gas")

  return (
    <div className="flex h-full w-full gap-6 p-6">
      {/* Left side: Map */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Mode selector */}
        <div className="flex items-center gap-4 p-4 bg-card border rounded-lg">
          <span className="font-semibold">Zone Type:</span>
          <div className="flex gap-2">
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
        </div>

        <ZonesMap
          zones={zones}
          onZoneCreated={handleZoneCreated}
          currentMode={currentMode}
        />
      </div>

      {/* Right side: Zones list */}
      <div className="w-80 flex flex-col gap-4 overflow-y-auto">
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
                  <div className="font-medium text-sm mb-1">{zone.name}</div>
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
                  <div className="font-medium text-sm mb-1">{zone.name}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Position: {zone.position[0].toFixed(5)}, {zone.position[1].toFixed(5)}</div>
                    <div className="italic">Wind calculation pending</div>
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
                Click to mark gas leak point. Zones calculated from wind direction/speed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
