"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    $chatwoot: any
    chatwootSDK: any
  }
}

export default function ChatwootWidget() {
  useEffect(() => {
    const BASE_URL = "https://chatwoot.ariaia.com/"
    const websiteToken = "pfEZLifCsPpEvafZT9grCRoT"
    let widgetLoaded = false

    function loadChatwoot() {
      // Si ya se cargó antes, no lo cargamos de nuevo
      if (widgetLoaded) return

      const script = document.createElement("script")
      script.src = BASE_URL + "/packs/js/sdk.js"
      script.defer = true
      script.async = true

      script.onload = () => {
        if (window.chatwootSDK) {
          window.chatwootSDK.run({
            websiteToken: websiteToken,
            baseUrl: BASE_URL,
            disablePersistence: true,
          })
          widgetLoaded = true
        }
      }

      document.head.appendChild(script)
    }

    // Cargar Chatwoot cuando el componente se monta
    loadChatwoot()

    // Cleanup function para remover el script si es necesario
    return () => {
      if (typeof window.$chatwoot !== "undefined") {
        try {
          window.$chatwoot.shutdown()
        } catch (error) {
          console.log("Error shutting down Chatwoot:", error)
        }
      }
    }
  }, [])

  return null // Este componente no renderiza nada visible
}
