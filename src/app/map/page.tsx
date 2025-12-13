"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Zone } from "@/components/zones/zones-map"
import { fetchZones } from "@/app/actions/zones"
import type { DeviceData } from "@/components/map/leaflet-map"

const LeafletMap = dynamic(
  () => import("@/components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
    ),
  }
)

type StatusDevice = {
  id: string
  name: string
  position: [number, number]
}

export default function MapPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loadingZones, setLoadingZones] = useState(true)
  const [zonesError, setZonesError] = useState<string | null>(null)

  const [anyInDanger, setAnyInDanger] = useState(false)
  const [anyInAlert, setAnyInAlert] = useState(false)
  const [dangerDevices, setDangerDevices] = useState<StatusDevice[]>([])
  const [alertDevices, setAlertDevices] = useState<StatusDevice[]>([])
  const [showStatusPanel, setShowStatusPanel] = useState(false)

  useEffect(() => {
    const loadZones = async () => {
      try {
        setLoadingZones(true)
        const data = await fetchZones()
        setZones(data)
        setZonesError(null)
      } catch (err) {
        console.error("Error loading zones:", err)
        setZonesError("Failed to load zones")
      } finally {
        setLoadingZones(false)
      }
    }

    loadZones()
  }, [])

  const machineZonesCount = zones.filter((z) => z.source === "machine").length
  const gasZonesCount = zones.filter((z) => z.source === "gas").length

  const renderStatusBadge = () => {
    if (anyInDanger) {
      return (
        <button
          type="button"
          onClick={() => setShowStatusPanel((v) => !v)}
          className="text-red-600 font-semibold animate-pulse underline-offset-2 hover:underline text-sm md:text-base"
        >
          ⚠️ DANGER ZONE ACTIVE ({dangerDevices.length})
        </button>
      )
    }
    if (anyInAlert) {
      return (
        <button
          type="button"
          onClick={() => setShowStatusPanel((v) => !v)}
          className="text-orange-500 font-semibold animate-pulse underline-offset-2 hover:underline text-sm md:text-base"
        >
          ⚠️ ALERT ZONE ACTIVE ({alertDevices.length})
        </button>
      )
    }
    return <span className="text-muted-foreground text-sm md:text-base">All clear</span>
  }

  const renderStatusPanel = () => {
    if (!showStatusPanel || (!anyInDanger && !anyInAlert)) return null

    const list = anyInDanger ? dangerDevices : alertDevices
    const title = anyInDanger
      ? "Devices inside danger zones"
      : "Devices inside alert zones"

    return (
      <div className="absolute right-2 top-14 z-[1000] w-full max-w-xs rounded-lg border bg-card shadow-lg md:right-6 md:w-80">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-xs md:text-sm font-semibold">{title}</span>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowStatusPanel(false)}
          >
            Close
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-2 text-xs md:text-sm">
          {list.length === 0 && (
            <div className="text-muted-foreground text-xs">
              No devices currently in this zone.
            </div>
          )}
          {list.map((d) => (
            <div key={d.id} className="border rounded-md px-2 py-1">
              <div className="font-medium text-xs">{d.name || d.id}</div>
              <div className="text-xs text-muted-foreground">ID: {d.id}</div>
              <div className="text-xs text-muted-foreground">
                Position: {d.position[0].toFixed(5)}, {d.position[1].toFixed(5)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loadingZones) {
    return (
      <div className="flex h-full w-full flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2 md:px-6 md:py-3">
          <h1 className="text-lg font-semibold md:text-xl">Map</h1>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <span>Devices & Zones</span>
            <span>Loading zones…</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg font-semibold">Loading map…</div>
        </div>
      </div>
    )
  }

  if (zonesError) {
    return (
      <div className="flex h-full w-full flex-col">
        <header className="flex items-center justify-between border-b px-4 py-2 md:px-6 md:py-3">
          <h1 className="text-lg font-semibold md:text-xl">Map</h1>
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <span>Devices & Zones</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-600">{zonesError}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full flex-col">
      <header className="flex flex-wrap items-center justify-between border-b px-4 py-2 gap-2 md:px-6 md:py-3 md:flex-nowrap">
        <h1 className="text-lg font-semibold md:text-xl">Map</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
          <span className="text-muted-foreground">Devices & Zones</span>
          <span className="text-muted-foreground">
            {machineZonesCount} Machine Zones • {gasZonesCount} Gas Sources
          </span>
          {renderStatusBadge()}
        </div>
      </header>

      {renderStatusPanel()}

      <section className="flex-1 min-h-0 px-2 pb-2 pt-1 md:px-4 md:pb-4 md:pt-2">
        <LeafletMap
          zones={zones}
          onDangerStatusChange={({
            anyInDanger,
            anyInAlert,
            dangerDevices,
            alertDevices,
          }: {
            anyInDanger: boolean
            anyInAlert: boolean
            dangerDevices: DeviceData[]
            alertDevices: DeviceData[]
          }) => {
            setAnyInDanger(anyInDanger)
            setAnyInAlert(anyInAlert)
            setDangerDevices(
              dangerDevices.map((d) => ({
                id: d.id,
                name: d.name,
                position: d.position,
              }))
            )
            setAlertDevices(
              alertDevices.map((d) => ({
                id: d.id,
                name: d.name,
                position: d.position,
              }))
            )
          }}
        />
      </section>
    </div>
  )
}
