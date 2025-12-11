"use client"

import dynamic from "next/dynamic"

const LeafletMap = dynamic(
  () => import("../../components/map/leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-lg" />,
  }
)

export default function MapPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <h1 className="text-xl font-semibold">Map</h1>
      </header>
      <section className="flex-1 min-h-0 px-4 pb-4 pt-2">
        <LeafletMap />
      </section>
    </div>
  )
}
