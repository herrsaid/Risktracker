"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { fetchZones } from "@/app/actions/zones"
import { Zone } from "@/components/zones/zones-map"

const MapView = dynamic(
  () => import("../../components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-lg" />,
  }
)

export default function MapPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadZones()
  }, [])

  const loadZones = async () => {
    const fetchedZones = await fetchZones()
    setZones(fetchedZones)
    setLoading(false)
  }

  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-xl font-semibold">Map</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Devices & Zones</span>
          {!loading && (
            <span className="font-medium">
              {zones.filter(z => z.source === 'machine').length} Machine Zones • 
              {zones.filter(z => z.source === 'gas').length} Gas Sources
            </span>
          )}
        </div>
      </header>
      <section className="flex-1 min-h-0 px-4 pb-4 pt-2">
        <MapView zones={zones} />
      </section>
    </div>
  )
}
