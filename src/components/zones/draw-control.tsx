"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet-draw"
import "leaflet-draw/dist/leaflet.draw.css"

type DrawControlProps = {
  onCreated: (e: any) => void
  currentZoneType: "danger" | "alert"
}

export function DrawControl({ onCreated, currentZoneType }: DrawControlProps) {
  const map = useMap()

  useEffect(() => {
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    const drawControl = new L.Control.Draw({
      position: "topright",
      draw: {
        polyline: false,
        marker: false,
        circlemarker: false,
        rectangle: {
          shapeOptions: {
            color: currentZoneType === "danger" ? "#dc2626" : "#f59e0b",
            fillOpacity: 0.3,
          },
        },
        polygon: {
          shapeOptions: {
            color: currentZoneType === "danger" ? "#dc2626" : "#f59e0b",
            fillOpacity: 0.3,
          },
        },
        circle: {
          shapeOptions: {
            color: currentZoneType === "danger" ? "#dc2626" : "#f59e0b",
            fillOpacity: 0.3,
          },
        },
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    })

    map.addControl(drawControl)

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer
      drawnItems.addLayer(layer)
      onCreated(e)
      // Remove layer after creation as we'll render from state
      setTimeout(() => drawnItems.removeLayer(layer), 100)
    })

    return () => {
      map.removeControl(drawControl)
      map.removeLayer(drawnItems)
    }
  }, [map, currentZoneType, onCreated])

  return null
}
