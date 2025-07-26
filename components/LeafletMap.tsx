"use client"

import { useEffect, useRef, useState } from "react"
import { Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LeafletMapProps {
  location: string
  onLocationSelect?: (lat: number, lng: number, address: string) => void // Hacer opcional
}

export default function LeafletMap({ location, onLocationSelect }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load Leaflet dynamically
    const loadLeaflet = async () => {
      if (typeof window !== "undefined" && !window.L) {
        const L = await import("leaflet")
        window.L = L.default || L

        // Fix default markers
        delete (window.L.Icon.Default.prototype as any)._getIconUrl
        window.L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        })
      }
      setIsLoaded(true)
    }

    loadLeaflet()
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.L) return

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = window.L.map(mapRef.current).setView([-12.0464, -77.0428], 13) // Lima, Peru

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current)
    }

    // Geocode location when it changes
    if (location && location.trim()) {
      geocodeLocation(location)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isLoaded, location])

  const geocodeLocation = async (locationQuery: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=1`,
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0]
        const latitude = Number.parseFloat(lat)
        const longitude = Number.parseFloat(lon)

        // Update map view
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 13)

          // Remove existing marker
          if (markerRef.current) {
            mapInstanceRef.current.removeLayer(markerRef.current)
          }

          // Add new marker
          markerRef.current = window.L.marker([latitude, longitude])
            .addTo(mapInstanceRef.current)
            .bindPopup(display_name)

          // NO LLAMAR AL CALLBACK - Esta línea se elimina completamente
          // if (onLocationSelect) {
          //   onLocationSelect(latitude, longitude, display_name)
          // }
        }
      }
    } catch (error) {
      console.error("Error geocoding location:", error)
    }
  }

  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                className="opacity-75"
              />
            </svg>
            <span className="text-sm">Cargando mapa...</span>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full rounded-lg border border-gray-200" style={{ minHeight: "240px" }} />

      {/* Botones superpuestos */}
      <Button size="sm" className="absolute top-2 left-2 bg-blue-600 hover:bg-blue-700 text-xs h-7 z-20">
        Seleccionar en Mapa
      </Button>

      <Button variant="outline" size="sm" className="absolute top-2 right-2 bg-white h-7 w-7 p-0 z-20">
        <Maximize2 className="w-3 h-3" />
      </Button>
    </div>
  )
}
