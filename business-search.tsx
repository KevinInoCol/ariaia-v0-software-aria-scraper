"use client"

import { useState, useEffect } from "react"
import { Settings, Search, Info, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import LeafletMap from "./components/LeafletMap"
import LeafletStyles from "./components/LeafletStyles"
import ChatwootWidget from "./components/ChatwootWidget"
import { ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"

// Tipo para los datos del scraping - actualizado con todos los nuevos campos
interface ScrapingResult {
  // Datos básicos (siempre presentes)
  title: string
  categoryName: string
  address: string
  neighborhood: string
  street: string
  website: string | null
  phone: string | null
  phoneUnformatted: string | null

  // Información Premium del Contacto (Persona) - solo cuando getEmails = true
  fullName?: string | null
  jobTitle?: string | null
  email?: string | null
  emails?: string[] | null
  linkedinProfile?: string | null
  mobileNumber?: string | null

  // Información Premium de la Empresa - solo cuando getEmails = true
  companyName?: string | null
  companyWebsite?: string | null
  companyLinkedin?: string | null
  companyPhoneNumber?: string | null
  companySize?: string | null
  industry?: string | null
  city?: string | null

  // Modelo de Negocio - solo cuando getBusinessModel = true
  businessModel?: string | null
}

// Add this interface at the top after the existing interfaces
interface BusinessSearchProps {
  onLogout?: () => void
}

// Función para formatear el tiempo transcurrido
const formatElapsedTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

// Función para obtener datos actualizados del usuario desde la base de datos
const fetchUserDataFromDB = async (userEmail: string) => {
  try {
    const supabaseUrl = "https://urxuebohedbjydwaedua.supabase.co"
    const serviceRoleKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeHVlYm9oZWRianlkd2FlZHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjcwMzg4OCwiZXhwIjoyMDY4Mjc5ODg4fQ.ltU3-hBu3rMs8CraxsROdXkMMWycecYR8s8gBJyFdRw"

    const res = await fetch(
      `${supabaseUrl}/rest/v1/usuarios_scraper?correo_electronico=eq.${encodeURIComponent(userEmail)}`,
      {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "return=representation",
        },
      },
    )

    if (!res.ok) return null
    const data = await res.json()
    if (!data.length) return null

    const userData = data[0]
    // Calcular leads restantes
    const totalLeads = (userData.leads_base_gratuitos || 0) + (userData.leads_adicionales_pagados || 0)
    const remaining = Math.max(0, totalLeads - (userData.numero_leads_scrapeados || 0))
    userData.remaining_leads = remaining
    return userData
  } catch (error) {
    console.error("Error fetching user data from DB:", error)
    return null
  }
}

// Update the component signature
export default function Component({ onLogout }: BusinessSearchProps) {
  const router = useRouter()
  const [businessType, setBusinessType] = useState("")
  const [location, setLocation] = useState("")
  const [getEmails, setGetEmails] = useState(false)
  const [getBusinessModel, setGetBusinessModel] = useState(false)
  const [showLeadsDropdown, setShowLeadsDropdown] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [paymentError, setPaymentError] = useState("")
  const [scrapingResults, setScrapingResults] = useState<ScrapingResult[]>([])
  const [ghlLabel, setGhlApiToken] = useState("")
  const [ghlApiToken, setGhlLabel] = useState("")
  const [leadsScrapedCount, setLeadsScrapedCount] = useState(0)
  const [remainingLeads, setRemainingLeads] = useState(0)

  // Estados para LinkedIn
  const [linkedinUsername, setLinkedinUsername] = useState("")
  const [linkedinPassword, setLinkedinPassword] = useState("")
  const [isLinkedinLoading, setIsLinkedinLoading] = useState(false)
  const [linkedinError, setLinkedinError] = useState("")
  const [linkedinSuccess, setLinkedinSuccess] = useState("")
  const [showLinkedinPassword, setShowLinkedinPassword] = useState(false)

  // Estados para el Paso 2: Modelo de Negocio
  const [isBusinessModelLoading, setIsBusinessModelLoading] = useState(false)
  const [businessModelError, setBusinessModelError] = useState("")
  const [businessModelSuccess, setBusinessModelSuccess] = useState("")

  const [activeSection, setActiveSection] = useState("leads") // Default to leads section
  const [showLinkedInSection, setShowLinkedInSection] = useState(false)

  // Estados para el contador de tiempo
  const [scrapingStartTime, setScrapingStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

  // Agregar después de los otros estados de LinkedIn
  const [showLinkedinModal, setShowLinkedinModal] = useState(false)

  // Cargar el contador de leads scrapeados al montar el componente
  useEffect(() => {
    const loadUserData = async () => {
      const userDataString = localStorage.getItem("aria_user_data")
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString)
          const userEmail = userData.email || userData.correo_electronico || userData.correoElectronico || ""

          if (userEmail) {
            // Obtener datos frescos desde la base de datos
            const freshUserData = await fetchUserDataFromDB(userEmail)
            if (freshUserData) {
              setLeadsScrapedCount(freshUserData.numero_leads_scrapeados || 0)
              setRemainingLeads(freshUserData.remaining_leads || 0)
              console.log("Contador de leads actualizado desde DB:", freshUserData.numero_leads_scrapeados)
              console.log("Leads restantes calculados:", freshUserData.remaining_leads)
            } else {
              // Fallback al localStorage si no se puede obtener desde DB
              const scrapedCount = userData.numero_leads_scrapeados || 0
              setLeadsScrapedCount(scrapedCount)
              // Calcular leads restantes desde localStorage
              const totalLeads = (userData.leads_base_gratuitos || 0) + (userData.leads_adicionales_pagados || 0)
              const remaining = Math.max(0, totalLeads - scrapedCount)
              setRemainingLeads(remaining)
            }
          }
        } catch (error) {
          console.error("Error al cargar datos del usuario:", error)
        }
      }
    }

    // Cargar datos inicialmente
    loadUserData()

    // Actualizar cada 30 segundos para mantener datos frescos
    const interval = setInterval(loadUserData, 30000)

    // Cleanup
    return () => clearInterval(interval)
  }, [])

  // Cleanup del timer al desmontar el componente
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [timerInterval])

  const downloadCSV = () => {
    if (scrapingResults.length === 0) return

    // Headers actualizados con todos los campos
    const headers = [
      // Datos Básicos
      "Nombre del Lugar",
      "Categoría",
      "Dirección",
      "Barrio",
      "Calle",
      "Sitio Web",
      "Teléfono",
      "Teléfono (Sin formato)",
      // Información Premium del Contacto (Persona) - solo cuando getEmails = true
      ...(getEmails
        ? [
            "Nombre Completo",
            "Cargo",
            "Email",
            "Emails Adicionales",
            "LinkedIn Personal",
            "Teléfono Móvil",
            // Información Premium de la Empresa
            "Nombre de la Empresa",
            "Sitio Web Empresa",
            "LinkedIn Empresa",
            "Teléfono Empresa",
            "Tamaño Empresa",
            "Industria",
            "Ciudad",
          ]
        : []),
      // Modelo de Negocio - siempre incluir si hay resultados
      ...(scrapingResults.length > 0 ? ["Modelo de Negocio"] : []),
    ]

    // Convertir los datos incluyendo todos los campos
    const csvContent = [
      headers.join(","), // Header row
      ...scrapingResults.map((result) => {
        const basicData = [
          `"${(result.title || "-").replace(/"/g, '""')}"`,
          `"${(result.categoryName || "-").replace(/"/g, '""')}"`,
          `"${(result.address || "-").replace(/"/g, '""')}"`,
          `"${(result.neighborhood || "-").replace(/"/g, '""')}"`,
          `"${(result.street || "-").replace(/"/g, '""')}"`,
          `"${(result.website || "-").replace(/"/g, '""')}"`,
          `"${(result.phone || "-").replace(/"/g, '""')}"`,
          `"${(result.phoneUnformatted || "-").replace(/"/g, '""')}"`,
        ]

        const premiumData = getEmails
          ? [
              `"${(result.fullName || "-").replace(/"/g, '""')}"`,
              `"${(result.jobTitle || "-").replace(/"/g, '""')}"`,
              `"${(result.email || "-").replace(/"/g, '""')}"`,
              `"${(result.emails && Array.isArray(result.emails) ? result.emails.join("; ") : "-").replace(/"/g, '""')}"`,
              `"${(result.linkedinProfile || "-").replace(/"/g, '""')}"`,
              `"${(result.mobileNumber || "-").replace(/"/g, '""')}"`,
              `"${(result.companyName || "-").replace(/"/g, '""')}"`,
              `"${(result.companyWebsite || "-").replace(/"/g, '""')}"`,
              `"${(result.companyLinkedin || "-").replace(/"/g, '""')}"`,
              `"${(result.companyPhoneNumber || "-").replace(/"/g, '""')}"`,
              `"${(result.companySize || "-").replace(/"/g, '""')}"`,
              `"${(result.industry || "-").replace(/"/g, '""')}"`,
              `"${(result.city || "-").replace(/"/g, '""')}"`,
            ]
          : []

        const businessModelData =
          scrapingResults.length > 0 ? [`"${(result.businessModel || "-").replace(/"/g, '""')}"`] : []

        return [...basicData, ...premiumData, ...businessModelData].join(",")
      }),
    ].join("\n")

    // Crear blob y descargar
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute(
        "download",
        `resultados-scraping-${businessType.replace(/[^a-zA-Z0-9]/g, "-") || "busqueda"}-${location.replace(/[^a-zA-Z0-9]/g, "-") || "ubicacion"}-${new Date().toISOString().split("T")[0]}.csv`,
      )
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleStartScraping = async () => {
    // Validar campos requeridos
    if (!businessType.trim()) {
      setError("El tipo de negocio es requerido")
      return
    }

    if (!location.trim()) {
      setError("La localización es requerida")
      return
    }

    // Validar formato de localización (debe tener exactamente 3 partes separadas por comas)
    const locationParts = location
      .trim()
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    if (locationParts.length !== 3) {
      setError("LOCATION_FORMAT_ERROR")
      return
    }

    setIsLoading(true)

    // Iniciar contador de tiempo
    const startTime = Date.now()
    setScrapingStartTime(startTime)
    setElapsedTime(0)

    // Iniciar el intervalo del contador
    const interval = setInterval(() => {
      const currentTime = Date.now()
      const elapsed = Math.floor((currentTime - startTime) / 1000)
      setElapsedTime(elapsed)
    }, 1000)
    setTimerInterval(interval)

    setError("")
    setSuccess("")
    setPaymentError("")
    setScrapingResults([]) // Limpiar resultados anteriores

    try {
      // Obtener información del usuario desde localStorage
      const userDataString = localStorage.getItem("aria_user_data")
      let userEmail = ""
      let userId = "user_123"

      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString)
          // Intentar obtener el email de diferentes campos posibles
          userEmail = userData.email || userData.correo_electronico || userData.correoElectronico || ""
          userId = userData.id_uuid || userData.id || "user_123"

          console.log("Datos del usuario recuperados:", userData)
          console.log("Email extraído:", userEmail)
        } catch (parseError) {
          console.error("Error al parsear datos del usuario:", parseError)
        }
      }

      // Validar que tenemos el email
      if (!userEmail) {
        setError("Error: No se pudo obtener el email del usuario. Por favor, inicia sesión nuevamente.")
        return
      }

      // Estructura JSON que coincide con la tabla usuarios_scraper
      const scrapingData = {
        businessType: businessType.trim(),
        location: location.trim(),
        getEmails: getEmails,
        getBusinessModel: getBusinessModel,
        timestamp: new Date().toISOString(),
        userId: userId,
        correo_electronico: userEmail, // Cambiar de correoElectronico a correo_electronico para coincidir con usuarios_scraper
      }

      console.log("Enviando datos a usuarios_scraper:", scrapingData)
      console.log("Email del usuario (usuarios_scraper):", userEmail)

      // Volver al endpoint de desarrollo
      const response = await fetch("https://kevin-inofuente-ai-developer.ngrok.app/start-scraping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scrapingData),
      })

      console.log("Respuesta del servidor:", response.status, response.statusText)

      // Verificar si es un error 402 (Payment Required)
      if (response.status === 402) {
        const errorData = await response.json().catch(() => ({ detail: "Error de plan de pago" }))
        setPaymentError(errorData.detail || "Error de plan de pago")
        return
      }

      // Verificar si es un error 403 (Forbidden - Límite alcanzado)
      if (response.status === 403) {
        setError("")
        setSuccess("")
        setPaymentError("")
        // Mostrar mensaje de límite alcanzado con el modal bonito
        setError("LIMIT_REACHED")
        return
      }

      // Verificar si es un error 422 (Unprocessable Entity)
      if (response.status === 422) {
        const errorData = await response.json().catch(() => ({ detail: "Datos inválidos" }))
        setError(`Error 422: ${errorData.detail || "Los datos enviados no son válidos. Verifica el formato."}`)
        console.error("Error 422 - Datos enviados:", scrapingData)
        console.error("Error 422 - Respuesta:", errorData)
        return
      }

      // Verificar otros errores HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.detail || errorData.message || `Error HTTP: ${response.status} - ${response.statusText}`
        setError(errorMessage)
        console.error("Error HTTP:", response.status, errorData)
        return
      }

      // Obtener la respuesta inicial con el jobId
      const initialResponse = await response.json().catch(() => null)
      console.log("Respuesta inicial:", initialResponse)

      // Verificar que tenemos el jobId
      if (!initialResponse || initialResponse.status !== "success" || !initialResponse.jobId) {
        setError("Error: No se pudo obtener el ID del trabajo. Respuesta inválida del servidor.")
        return
      }

      const jobId = initialResponse.jobId
      console.log("JobId obtenido:", jobId)

      // Mostrar mensaje de scraping en progreso
      setSuccess(
        "Scrapeando leads... puede tomar entre 1 a 5 min, dependiendo de la cantidad de leads que vayamos a traer",
      )

      // Función para consultar el estado del trabajo
      const pollJobStatus = async () => {
        try {
          // Volver al endpoint de desarrollo para consultar el estado del trabajo
          const jobResponse = await fetch(`https://kevin-inofuente-ai-developer.ngrok.app/job/${jobId}`)

          if (!jobResponse.ok) {
            console.error("Error consultando estado del trabajo:", jobResponse.status, jobResponse.statusText)
            return false // Continuar polling
          }

          const jobData = await jobResponse.json()
          console.log("Estado del trabajo:", jobData)

          if (jobData.status === "COMPLETED") {
            // Trabajo completado, procesar resultados
            if (jobData.results && jobData.results.data && Array.isArray(jobData.results.data)) {
              setScrapingResults(jobData.results.data)
              const count = jobData.results.results_count || jobData.results.data.length
              setSuccess(`Scraping completado exitosamente. ${count} resultados encontrados.`)

              // Actualizar el contador desde la base de datos después del scraping exitoso
              const userDataString = localStorage.getItem("aria_user_data")
              if (userDataString) {
                try {
                  const userData = JSON.parse(userDataString)
                  const userEmail = userData.email || userData.correo_electronico || userData.correoElectronico || ""

                  if (userEmail) {
                    // Obtener datos actualizados desde la base de datos
                    const freshUserData = await fetchUserDataFromDB(userEmail)
                    if (freshUserData) {
                      setLeadsScrapedCount(freshUserData.numero_leads_scrapeados || 0)
                      setRemainingLeads(freshUserData.remaining_leads || 0)
                    }
                  }
                } catch (error) {
                  console.error("Error al actualizar contador desde DB:", error)
                }
              }

              // Actualizar contadores locales
              setLeadsScrapedCount((prev) => prev + count)
              setRemainingLeads((prev) => Math.max(0, prev - count))
            } else if (jobData.results && Array.isArray(jobData.results.results)) {
              setScrapingResults(jobData.results.results)
              setSuccess(`Scraping completado exitosamente. ${jobData.results.results.length} resultados encontrados.`)

              // Actualizar contadores
              setLeadsScrapedCount((prev) => prev + jobData.results.results.length)
              setRemainingLeads((prev) => Math.max(0, prev - jobData.results.results.length))
            } else if (jobData.results && Array.isArray(jobData.results)) {
              setScrapingResults(jobData.results)
              setSuccess(`Scraping completado exitosamente. ${jobData.results.length} resultados encontrados.`)

              // Actualizar contadores
              setLeadsScrapedCount((prev) => prev + jobData.results.length)
              setRemainingLeads((prev) => Math.max(0, prev - jobData.results.length))
            } else {
              setSuccess("Scraping completado exitosamente")
            }

            // Detener contador de tiempo inmediatamente
            return true // Detener polling
          } else if (jobData.status === "FAILED" || jobData.status === "ERROR") {
            // Trabajo falló
            setError(`Error en el scraping: ${jobData.message || "Error desconocido"}`)
            return true // Detener polling
          } else {
            // Trabajo aún en progreso (PENDING, PROCESSING, etc.)
            console.log("Trabajo aún en progreso, continuando polling...")
            return false // Continuar polling
          }
        } catch (error) {
          console.error("Error consultando estado del trabajo:", error)
          return false // Continuar polling en caso de error de red
        }
      }

      // Iniciar polling cada 4 segundos
      const pollInterval = setInterval(async () => {
        const shouldStop = await pollJobStatus()
        if (shouldStop) {
          clearInterval(pollInterval)
          setIsLoading(false)
          // Detener contador de tiempo inmediatamente usando la referencia actual
          setTimerInterval((currentTimerInterval) => {
            if (currentTimerInterval) {
              clearInterval(currentTimerInterval)
            }
            return null
          })
        }
      }, 4000)

      // Timeout de seguridad (10 minutos máximo)
      setTimeout(() => {
        clearInterval(pollInterval)
        if (isLoading) {
          setIsLoading(false)
          // Detener contador de tiempo
          if (timerInterval) {
            clearInterval(timerInterval)
            setTimerInterval(null)
          }
          setError("Timeout: El scraping está tomando más tiempo del esperado. Por favor, intenta nuevamente.")
        }
      }, 600000) // 10 minutos
    } catch (err) {
      console.error("Error completo:", err)
      setError(
        `Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}. Verifica la URL del webhook y tu conexión.`,
      )
      setIsLoading(false)
      // Detener contador de tiempo
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
    }
  }

  const handleSaveLinkedinCredentials = async () => {
    // Validar campos requeridos
    if (!linkedinUsername.trim()) {
      setLinkedinError("El username de LinkedIn es requerido")
      return
    }

    if (!linkedinPassword.trim()) {
      setLinkedinError("La contraseña de LinkedIn es requerida")
      return
    }

    setIsLinkedinLoading(true)
    setLinkedinError("")
    setLinkedinSuccess("")

    try {
      // Obtener información del usuario desde localStorage
      const userDataString = localStorage.getItem("aria_user_data")
      let userEmail = ""

      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString)
          userEmail = userData.email || userData.correo_electronico || userData.correoElectronico || ""
        } catch (parseError) {
          console.error("Error al parsear datos del usuario:", parseError)
        }
      }

      // Preparar datos para enviar
      const linkedinData = {
        username: linkedinUsername.trim(),
        password: linkedinPassword.trim(),
        userEmail: userEmail,
        timestamp: new Date().toISOString(),
      }

      console.log("Enviando credenciales de LinkedIn:", { ...linkedinData, password: "***" })

      const response = await fetch("https://n8n.ariaia.com/webhook-test/mensaje-aria-scraper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(linkedinData),
      })

      console.log("Respuesta del servidor LinkedIn:", response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.detail || errorData.message || `Error HTTP: ${response.status} - ${response.statusText}`
        setLinkedinError(errorMessage)
        console.error("Error HTTP LinkedIn:", response.status, errorData)
        return
      }

      // Éxito
      setLinkedinSuccess("✅ Credenciales de LinkedIn guardadas exitosamente")
      // Mostrar modal informativo
      setShowLinkedinModal(true)
      // Limpiar los campos después del envío exitoso
      setLinkedinUsername("")
      setLinkedinPassword("")
    } catch (err) {
      console.error("Error completo LinkedIn:", err)
      setLinkedinError(
        `Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}. Verifica tu conexión.`,
      )
    } finally {
      setIsLinkedinLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Chatwoot Widget */}
      <ChatwootWidget />

      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 border-r border-blue-700 flex flex-col">
        {/* Logo - Reorganizado verticalmente */}
        <div className="p-8 border-b border-blue-700/50">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-700/50 backdrop-blur-sm flex items-center justify-center border border-blue-600/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-xl text-white">ARIA SCRAPER</div>
              <div className="text-base text-blue-300 font-medium">SUITE</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div
              className={`flex items-center gap-3 text-sm cursor-pointer transition-colors rounded-xl p-4 ${
                activeSection === "recharge"
                  ? "bg-blue-700/50 text-white border border-blue-600/30"
                  : "text-blue-200 hover:text-white hover:bg-blue-700/30"
              }`}
              onClick={() => {
                router.push("/recarga-leads")
              }}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Recarga de Leads</span>
            </div>

            <div
              className={`rounded-xl p-4 cursor-pointer transition-colors border ${
                activeSection === "leads"
                  ? "bg-blue-700/50 text-white border-blue-600/30"
                  : "bg-blue-800/30 text-blue-100 hover:bg-blue-700/40 border-blue-700/30"
              }`}
              onClick={() => {
                setShowLeadsDropdown(!showLeadsDropdown)
                setActiveSection("leads")
              }}
            >
              <div className="flex items-center gap-3 font-medium">
                <Search className="w-5 h-5" />
                <span>Búsqueda de Leads</span>
                <ChevronDown
                  className={`w-4 h-4 ml-auto transition-transform ${showLeadsDropdown ? "rotate-0" : "-rotate-90"}`}
                />
              </div>
            </div>

            {showLeadsDropdown && (
              <div className="pl-4 space-y-3 text-sm">
                <div className="text-blue-200 font-medium cursor-pointer hover:text-white transition-colors py-2">
                  Nueva Búsqueda
                </div>
                <div className="cursor-pointer hover:text-white transition-colors py-2 text-blue-300">
                  Listas Guardadas
                </div>

                {/* Contador de Leads Scrapeados */}
                <div className="bg-blue-800/40 backdrop-blur-sm rounded-xl p-4 mt-4 border border-blue-700/30">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-200 mb-2">Scrapeaste:</div>
                    <div className="text-3xl font-bold text-blue-300 mb-3">{leadsScrapedCount.toLocaleString()}</div>
                    <div className="text-xs text-blue-300/80 leading-tight">
                      Número de Leads Scrapeados mapeados por el Sistema ARIA SCRAPER
                    </div>
                  </div>
                </div>

                {/* Contador de leads restantes */}
                <div className="bg-blue-800/40 backdrop-blur-sm rounded-xl p-4 border border-blue-700/30">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-200 mb-2">Te quedan:</div>
                    <div className="text-3xl font-bold text-green-400 mb-3">{remainingLeads.toLocaleString()}</div>
                    <div className="text-xs text-blue-300/80 leading-tight">
                      Número de Leads scrapeables restantes en tu cuenta
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nueva sección de LinkedIn */}
            <div
              className={`rounded-xl p-4 cursor-pointer transition-colors border ${
                activeSection === "linkedin"
                  ? "bg-blue-700/50 text-white border-blue-600/30"
                  : "bg-blue-800/30 text-blue-100 hover:bg-blue-700/40 border-blue-700/30"
              }`}
              onClick={() => {
                setActiveSection("linkedin")
                setShowLinkedInSection(true)
                setShowLeadsDropdown(false)
              }}
            >
              <div className="flex items-center gap-3 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span>Envío de Conexión por LinkedIn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button - Bottom of Sidebar */}
        <div className="p-6 border-t border-blue-700/50 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("Cerrando sesión...")
              if (onLogout) {
                onLogout()
              }
            }}
            className="w-full text-blue-200 border-blue-600/30 hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-300 bg-blue-800/30 transition-all duration-200 font-medium rounded-xl py-3"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white overflow-y-auto">
        {activeSection === "linkedin" ? (
          /* Contenido de LinkedIn */

          <div className="p-12 max-w-[1600px] mx-auto">
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Envío de Conexión por LinkedIn
                </h1>
              </div>
              <p className="text-gray-600 text-base ml-5 font-medium">
                Automatiza el envío de solicitudes de conexión en LinkedIn
              </p>
            </div>

            {/* Grid principal con mejor spacing */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 mb-16">
              {/* Columna Izquierda - Credenciales */}
              <div className="space-y-8">
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Credenciales de LinkedIn</h2>

                  <div className="space-y-6">
                    {/* Campo Username */}
                    <div>
                      <Label htmlFor="linkedin-username" className="text-sm font-medium text-gray-700 mb-3 block">
                        Username de LinkedIn
                      </Label>
                      <Input
                        id="linkedin-username"
                        type="text"
                        placeholder="tu-email@ejemplo.com"
                        className="w-full h-12 text-base"
                        value={linkedinUsername}
                        onChange={(e) => setLinkedinUsername(e.target.value)}
                        disabled={isLinkedinLoading}
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Ingresa el email o username que usas para iniciar sesión en LinkedIn
                      </p>
                    </div>

                    {/* Campo Password */}
                    <div>
                      <Label htmlFor="linkedin-password" className="text-sm font-medium text-gray-700 mb-3 block">
                        Password de LinkedIn
                      </Label>
                      <div className="relative">
                        <Input
                          id="linkedin-password"
                          type={showLinkedinPassword ? "text" : "password"}
                          placeholder="Ingresa tu contraseña"
                          className="w-full h-12 text-base pr-12"
                          value={linkedinPassword}
                          onChange={(e) => setLinkedinPassword(e.target.value)}
                          disabled={isLinkedinLoading}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-4 flex items-center"
                          onClick={() => setShowLinkedinPassword(!showLinkedinPassword)}
                          disabled={isLinkedinLoading}
                        >
                          {showLinkedinPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Tu contraseña será encriptada y almacenada de forma segura
                      </p>
                    </div>
                  </div>

                  {/* Nota de seguridad */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mt-6">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Información de Seguridad</p>
                      <p>
                        Tus credenciales de LinkedIn son almacenadas de forma segura y encriptada. Solo se utilizan para
                        automatizar el envío de conexiones según tu configuración.
                      </p>
                    </div>
                  </div>

                  {/* Mensajes de error y éxito */}
                  {linkedinError && (
                    <div className="text-red-600 text-sm bg-red-50 p-4 rounded-lg border border-red-200 mt-4">
                      {linkedinError}
                    </div>
                  )}

                  {linkedinSuccess && (
                    <div className="text-green-600 text-sm bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
                      {linkedinSuccess}
                    </div>
                  )}

                  {/* Botón de guardar credenciales */}
                  <div className="mt-8">
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-medium disabled:opacity-50"
                      onClick={handleSaveLinkedinCredentials}
                      disabled={isLinkedinLoading || !linkedinUsername.trim() || !linkedinPassword.trim()}
                    >
                      {isLinkedinLoading ? "Guardando..." : "Guardar Credenciales"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha - Conexión Automática */}
              <div className="space-y-8">
                <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Conexión automática por medio de LinkedIn
                  </h2>

                  {/* Estadísticas de leads con LinkedIn */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">Leads con LinkedIn disponibles</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {scrapingResults.length > 0
                            ? `${scrapingResults.filter((lead) => lead.linkedinProfile || lead.companyLinkedin).length} de ${scrapingResults.length} leads tienen perfil de LinkedIn`
                            : "Realiza un scraping primero para ver los leads disponibles"}
                        </p>
                      </div>
                    </div>

                    {scrapingResults.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-white rounded-lg p-4 border border-blue-100">
                          <div className="text-3xl font-bold text-blue-600 mb-1">
                            {scrapingResults.filter((lead) => lead.linkedinProfile).length}
                          </div>
                          <div className="text-sm text-gray-600">LinkedIn Personal</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-blue-100">
                          <div className="text-3xl font-bold text-purple-600 mb-1">
                            {scrapingResults.filter((lead) => lead.companyLinkedin).length}
                          </div>
                          <div className="text-sm text-gray-600">LinkedIn Empresa</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Descripción del proceso */}
                  <div className="space-y-6 mb-8">
                    <p className="text-base text-gray-600 leading-relaxed">
                      Esta función enviará automáticamente invitaciones de conexión a todos los leads que tengan
                      perfiles de LinkedIn disponibles.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-2">Requisitos importantes:</p>
                          <ul className="space-y-1 list-disc list-inside">
                            <li>Debes haber guardado tus credenciales de LinkedIn</li>
                            <li>Tener leads scrapeados con perfiles de LinkedIn</li>
                            <li>El proceso puede tomar varios minutos dependiendo de la cantidad</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón principal de envío */}
                  <div className="text-center">
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      disabled={
                        scrapingResults.length === 0 ||
                        scrapingResults.filter((lead) => lead.linkedinProfile || lead.companyLinkedin).length === 0 ||
                        !linkedinSuccess
                      }
                      onClick={async () => {
                        // TODO: Implementar la lógica de envío automático
                        // El usuario proporcionará el endpoint del backend más tarde
                        console.log("Iniciando envío automático de conexiones LinkedIn...")

                        // Filtrar leads con LinkedIn
                        const leadsWithLinkedIn = scrapingResults.filter(
                          (lead) => lead.linkedinProfile || lead.companyLinkedin,
                        )

                        console.log(`Enviando conexiones a ${leadsWithLinkedIn.length} leads con LinkedIn`)

                        // Placeholder para la implementación futura
                        alert(
                          `Se enviarán conexiones a ${leadsWithLinkedIn.length} leads con LinkedIn. Funcionalidad en desarrollo.`,
                        )
                      }}
                    >
                      <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      Iniciar Envío de Conexiones por LinkedIn
                    </Button>

                    {/* Mensaje de estado del botón */}
                    <div className="mt-4 text-sm text-gray-500">
                      {scrapingResults.length === 0 && <p>Primero realiza un scraping para obtener leads</p>}
                      {scrapingResults.length > 0 &&
                        scrapingResults.filter((lead) => lead.linkedinProfile || lead.companyLinkedin).length === 0 && (
                          <p>No hay leads con perfiles de LinkedIn disponibles</p>
                        )}
                      {!linkedinSuccess &&
                        scrapingResults.filter((lead) => lead.linkedinProfile || lead.companyLinkedin).length > 0 && (
                          <p>Guarda tus credenciales de LinkedIn primero</p>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección adicional para futuras funcionalidades */}
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Automatización Avanzada</h3>
              <p className="text-gray-600 text-base max-w-2xl mx-auto">
                Próximamente podrás configurar mensajes personalizados, horarios de envío y seguimiento automático de
                conexiones.
              </p>
            </div>
          </div>
        ) : (
          /* Contenido original de Form Section */
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Nueva Búsqueda de Leads
                </h1>
              </div>
              <p className="text-gray-600 text-sm ml-5 font-medium">
                Encuentra y enriquece datos de contacto empresarial
              </p>
            </div>

            <div className="space-y-6">
              {/* Todo el contenido existente del formulario se mantiene igual */}
              {/* Primera fila: Tipo de Negocio y Localización */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="business-type" className="text-sm font-medium text-gray-700 mb-2 block">
                    Tipo de Negocio
                  </Label>
                  <Input
                    id="business-type"
                    placeholder="Ej: Peluquería"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-gray-700 mb-2 block">
                    Localización
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full"
                    placeholder="Ej: Miraflores, Lima"
                  />
                </div>
              </div>

              {/* El resto del contenido del formulario se mantiene exactamente igual */}
              {/* Segunda fila: Checkbox y nota amarilla a la izquierda, High Level + Mapa a la derecha */}
              <div className="flex gap-8 items-start">
                {/* Lado izquierdo: Checkbox y nota amarilla */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="get-emails"
                      checked={getEmails}
                      onCheckedChange={(checked) => setGetEmails(checked === true)}
                    />
                    <Label htmlFor="get-emails" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Enriquecer con Datos Premium (Ejm: Emails, Perfil LinkedIn, etc)
                    </Label>
                  </div>

                  {/* Nota informativa sobre el consumo adicional de créditos */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <p className="font-medium mb-1">Consumo Adicional de Créditos</p>
                      <p className="mb-2">
                        Esta opción consume más créditos al activar una búsqueda profunda de datos de contacto y empresa
                        (cargo, email, LinkedIn). Tu límite mensual se reducirá; por ejemplo, un plan de 500 créditos te
                        permitirá obtener ~400 leads enriquecidos.
                      </p>
                      <p>
                        <strong>Nota:</strong> El éxito del enriquecimiento depende de la información pública de cada
                        empresa.
                      </p>
                    </div>
                  </div>

                  <Button
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-8 mt-4"
                    onClick={handleStartScraping}
                    disabled={isLoading}
                  >
                    {isLoading ? "Iniciando..." : "Iniciar Scraping"}
                  </Button>

                  {/* Mensaje de scraping en progreso */}
                  {isLoading && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mt-0.5 flex-shrink-0"></div>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          <span className="font-bold">Scrapeando....., puede tomar entre 1 a 5 min</span>, dependiendo
                          de la cantidad de leads que vayamos a traer
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Contador de tiempo */}
                  {(isLoading || elapsedTime > 0) && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Tiempo transcurrido:</span> {formatElapsedTime(elapsedTime)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Paso 2: Obtener Modelo de Negocio */}
                  {scrapingResults.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          2
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Obtener Modelo de Negocio</h3>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">
                        Analiza las websites de los leads scrapeados para obtener información sobre su modelo de
                        negocio.
                      </p>

                      <Button
                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-8"
                        onClick={async () => {
                          setIsBusinessModelLoading(true)
                          setBusinessModelError("")
                          setBusinessModelSuccess("")

                          try {
                            // Filtrar solo los leads que tienen website
                            const leadsWithWebsite = scrapingResults.filter(
                              (lead) => lead.website && lead.website.trim() !== "" && lead.website !== "-",
                            )

                            if (leadsWithWebsite.length === 0) {
                              setBusinessModelError(
                                "No se encontraron leads con website para analizar el modelo de negocio.",
                              )
                              return
                            }

                            // Obtener información del usuario desde localStorage
                            const userDataString = localStorage.getItem("aria_user_data")
                            let userEmail = ""

                            if (userDataString) {
                              try {
                                const userData = JSON.parse(userDataString)
                                userEmail =
                                  userData.email || userData.correo_electronico || userData.correoElectronico || ""
                              } catch (parseError) {
                                console.error("Error al parsear datos del usuario:", parseError)
                              }
                            }

                            // Preparar datos para enviar
                            const businessModelData = {
                              leads: leadsWithWebsite,
                              userEmail: userEmail,
                              timestamp: new Date().toISOString(),
                            }

                            console.log("Enviando datos para análisis de modelo de negocio:", businessModelData)

                            // Volver al endpoint de desarrollo para el análisis de modelo de negocio
                            const response = await fetch(
                              "https://kevin-inofuente-ai-developer.ngrok.app/analyze-business-model",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify(businessModelData),
                              },
                            )

                            if (!response.ok) {
                              const errorData = await response.json().catch(() => ({}))
                              const errorMessage =
                                errorData.detail ||
                                errorData.message ||
                                `Error HTTP: ${response.status} - ${response.statusText}`
                              setBusinessModelError(errorMessage)
                              return
                            }

                            const result = await response.json()
                            console.log("Respuesta del análisis de modelo de negocio:", result)

                            // Actualizar los resultados con los modelos de negocio obtenidos
                            if (result.results && Array.isArray(result.results)) {
                              const updatedResults = scrapingResults.map((lead) => {
                                const businessModelResult = result.results.find((r) => r.website === lead.website)
                                return {
                                  ...lead,
                                  businessModel: businessModelResult ? businessModelResult.businessModel : null,
                                }
                              })
                              setScrapingResults(updatedResults)
                              setBusinessModelSuccess(
                                `✅ Análisis completado. Se analizaron ${result.results.length} websites exitosamente.`,
                              )
                            } else {
                              setBusinessModelSuccess("✅ Análisis de modelo de negocio completado.")
                            }
                          } catch (err) {
                            console.error("Error en análisis de modelo de negocio:", err)
                            setBusinessModelError(
                              `Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}`,
                            )
                          } finally {
                            setIsBusinessModelLoading(false)
                          }
                        }}
                        disabled={isBusinessModelLoading || scrapingResults.length === 0}
                      >
                        {isBusinessModelLoading ? "Analizando..." : "Paso 2: Obtener Modelo de Negocio"}
                      </Button>

                      {/* Mensaje de análisis en progreso */}
                      {isBusinessModelLoading && (
                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mt-0.5 flex-shrink-0"></div>
                            <p className="text-sm text-purple-800 leading-relaxed">
                              <span className="font-bold">Analizando modelos de negocio...</span> Esto puede tomar unos
                              minutos dependiendo de la cantidad de websites a analizar.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Mensajes de error y éxito para modelo de negocio */}
                      {businessModelError && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200 mt-3">
                          {businessModelError}
                        </div>
                      )}

                      {businessModelSuccess && (
                        <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200 mt-3">
                          {businessModelSuccess}
                        </div>
                      )}

                      {/* Información sobre el proceso */}
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium mb-1">Información del Análisis</p>
                          <p>
                            Solo se analizarán los leads que tengan una website válida. El modelo de negocio se obtiene
                            mediante análisis automatizado del contenido web de cada empresa.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lado derecho: High Level fields y Mapa */}
                <div className="flex-1 flex gap-6">
                  {/* Campos de High Level */}
                  <div className="flex-1 space-y-4">
                    {/* Campo para API Token */}
                    <div>
                      <Label
                        htmlFor="ghl-api-token"
                        className={`text-sm font-bold mb-2 block ${scrapingResults.length === 0 ? "text-gray-400" : "text-gray-700"}`}
                      >
                        API Token de High Level
                      </Label>
                      <Input
                        id="ghl-api-token"
                        type="password"
                        placeholder="Ingresa tu API token de High Level"
                        value={ghlApiToken}
                        onChange={(e) => setGhlApiToken(e.target.value)}
                        className="w-full mb-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={scrapingResults.length === 0}
                      />
                      <p className={`text-xs mb-3 ${scrapingResults.length === 0 ? "text-gray-400" : "text-gray-500"}`}>
                        Encuentra tu API token en tu cuenta de High Level → Settings → API
                      </p>
                    </div>

                    {/* Campo para etiqueta */}
                    <div>
                      <Label
                        htmlFor="ghl-label"
                        className={`text-sm font-bold mb-2 block ${scrapingResults.length === 0 ? "text-gray-400" : "text-gray-700"}`}
                      >
                        Etiqueta para High Level
                      </Label>
                      <Input
                        id="ghl-label"
                        placeholder="Ej: Leads Peluquerías Lima - Enero 2025"
                        value={ghlLabel}
                        onChange={(e) => setGhlLabel(e.target.value)}
                        className="w-full mb-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={scrapingResults.length === 0}
                        maxLength={30}
                      />
                      <p className={`text-xs mb-4 ${scrapingResults.length === 0 ? "text-gray-400" : "text-gray-500"}`}>
                        Esta etiqueta te ayudará a identificar y organizar tus leads en High Level (máx. 30 caracteres)
                      </p>
                    </div>

                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!ghlApiToken.trim() || !ghlLabel.trim() || scrapingResults.length === 0}
                      title={
                        !ghlApiToken.trim()
                          ? "Ingresa tu API token de High Level"
                          : !ghlLabel.trim()
                            ? "Ingresa una etiqueta para continuar"
                            : scrapingResults.length === 0
                              ? "Primero realiza un scraping para obtener datos"
                              : "Enviar leads a High Level"
                      }
                      onClick={async () => {
                        try {
                          // Preparar el JSON completo para enviar al webhook
                          const webhookData = {
                            scrapingResults: scrapingResults,
                            "Datos del Usuario para su GHL": {
                              apiToken: ghlApiToken,
                              etiqueta: ghlLabel,
                            },
                          }

                          console.log("Enviando datos al webhook de High Level:", webhookData)

                          // Enviar datos al webhook
                          const response = await fetch("https://n8n.ariaia.com/webhook/SubirGHL", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify(webhookData),
                          })

                          if (response.ok) {
                            setSuccess(`✅ Datos enviados exitosamente a High Level con la etiqueta "${ghlLabel}"`)
                            // Limpiar los campos después del envío exitoso
                            setGhlApiToken("")
                            setGhlLabel("")
                          } else {
                            const errorData = await response.json().catch(() => ({}))
                            setError(`Error al enviar datos a High Level: ${errorData.message || response.statusText}`)
                          }
                        } catch (err) {
                          console.error("Error enviando a High Level:", err)
                          setError(
                            `Error de conexión al enviar a High Level: ${err instanceof Error ? err.message : "Error desconocido"}`,
                          )
                        }
                      }}
                    >
                      Enviar a High Level
                    </Button>

                    {/* Add this message next to the button */}
                    {scrapingResults.length === 0 && (
                      <div className="flex items-start gap-2 mt-3">
                        <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          Esta opción solo se habilita una vez que se termine el scrapeo de los Leads
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mapa */}
                  <div className="w-80 h-60">
                    <LeafletStyles />
                    <LeafletMap location={location} />
                  </div>
                </div>
              </div>

              {/* Mensajes de error y éxito */}
              {error && error === "LIMIT_REACHED" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                    {/* Icono de advertencia - círculo rosa con triángulo rojo */}
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>

                    {/* Título */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Límite Alcanzado</h2>

                    {/* Subtítulo */}
                    <p className="text-lg text-gray-600 mb-4">Has alcanzado tu límite de 500 leads por mes</p>

                    {/* Descripción actualizada */}
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                      No puedes realizar más scraping hasta el próximo inicio de mes a menos que tu mismo hagas una
                      recarga de leads presionando en el botón "Recarga de Leads".
                    </p>

                    {/* Botones */}
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => setError("")}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-base"
                      >
                        Entendido
                      </Button>
                      <Button
                        onClick={() => {
                          router.push("/recarga-leads")
                          setError("")
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-medium text-base"
                      >
                        Recarga de Leads
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {error && error === "LOCATION_FORMAT_ERROR" && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
                    {/* Icono de información - círculo azul con signo de exclamación */}
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>

                    {/* Título */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Formato de Localización Incorrecto</h2>

                    {/* Mensaje principal */}
                    <p className="text-lg text-gray-600 mb-4">
                      La localización debe tener exactamente 3 parámetros separados por comas
                    </p>

                    {/* Ejemplo */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm font-medium text-blue-800 mb-2">Ejemplo correcto:</p>
                      <p className="text-base font-semibold text-blue-900">San Isidro, Lima, Perú</p>
                    </div>

                    {/* Descripción adicional */}
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                      Asegúrate de incluir el distrito/barrio, la ciudad y el país, separados por comas.
                    </p>

                    {/* Botón */}
                    <Button
                      onClick={() => setError("")}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-base"
                    >
                      Entendido
                    </Button>
                  </div>
                </div>
              )}

              {error && error !== "LIMIT_REACHED" && error !== "LOCATION_FORMAT_ERROR" && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200 max-w-2xl">
                  {error}
                </div>
              )}

              {paymentError && (
                <div className="text-amber-800 text-sm bg-amber-50 p-3 rounded border border-amber-200 max-w-2xl">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Plan de Pago Requerido</p>
                      <p>{paymentError}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200 max-w-2xl">
                  {success}
                </div>
              )}

              {/* Tabla de Resultados del Scraping */}
              {scrapingResults.length > 0 && (
                <div className="mt-8 w-full space-y-6">
                  {/* Botón de Descarga CSV */}
                  <div className="flex justify-center mb-6">
                    <Button
                      onClick={downloadCSV}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                    >
                      📥 Descargar CSV de la Tabla de Leads Scrapeados hacia tu computador
                    </Button>
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Resultados del Scraping ({scrapingResults.length} encontrados)
                  </h2>

                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          {/* Fila de agrupación superior */}
                          <tr>
                            {/* Datos Básicos Extraídos - Azul */}
                            <th
                              colSpan={8}
                              className="px-3 py-2 text-center text-sm font-semibold text-blue-700 bg-blue-50 border-b border-blue-200"
                            >
                              📊 Datos Básicos Extraídos
                            </th>
                            {getEmails && (
                              <>
                                {/* Información Premium del Contacto (Persona) - Verde */}
                                <th
                                  colSpan={6}
                                  className="px-3 py-2 text-center text-sm font-semibold text-green-700 bg-green-50 border-b border-green-200"
                                >
                                  👤 Información Premium del Contacto (Persona)
                                </th>
                                {/* Información Premium de la Empresa - Púrpura */}
                                <th
                                  colSpan={7}
                                  className="px-3 py-2 text-center text-sm font-semibold text-purple-700 bg-purple-50 border-b border-purple-200"
                                >
                                  🏢 Información Premium de la Empresa
                                </th>
                              </>
                            )}
                            {scrapingResults.length > 0 && (
                              <th
                                colSpan={1}
                                className="px-3 py-2 text-center text-sm font-semibold text-orange-700 bg-orange-50 border-b border-orange-200"
                              >
                                🏪 Modelo de Negocio
                              </th>
                            )}
                          </tr>
                          {/* Fila de headers de columnas */}
                          <tr>
                            {/* Datos Básicos */}
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Nombre del Lugar
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Categoría
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Dirección
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Barrio
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Calle
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Sitio Web
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Teléfono
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                              Teléfono (Sin formato)
                            </th>
                            {getEmails && (
                              <>
                                {/* Información Premium del Contacto (Persona) */}
                                <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider whitespace-nowrap">
                                  Nombre Completo
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider whitespace-nowrap">
                                  Cargo
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider whitespace-nowrap">
                                  Email
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider whitespace-nowrap">
                                  Emails Adicionales
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider whitespace-nowrap">
                                  LinkedIn Personal
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider whitespace-nowrap">
                                  Teléfono Móvil
                                </th>
                                {/* Información Premium de la Empresa */}
                                <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap">
                                  Nombre Empresa
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap">
                                  Sitio Web Empresa
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap">
                                  LinkedIn Empresa
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap">
                                  Teléfono Empresa
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap">
                                  Tamaño Empresa
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap">
                                  Industria
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider whitespace-nowrap">
                                  Ciudad
                                </th>
                              </>
                            )}
                            {scrapingResults.length > 0 && (
                              <th className="px-3 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider whitespace-nowrap">
                                Modelo de Negocio
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {scrapingResults.map((result, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {/* Datos Básicos */}
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.title || "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.categoryName || "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.address || "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.neighborhood || "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.street || "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.website || "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.phone || "-"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.phoneUnformatted || "-"}
                              </td>
                              {getEmails && (
                                <>
                                  {/* Información Premium del Contacto (Persona) */}
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                                    {result.fullName || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                                    {result.jobTitle || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                                    {result.email || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                                    {result.emails && Array.isArray(result.emails) ? result.emails.join("; ") : "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                                    {result.linkedinProfile || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-green-600">
                                    {result.mobileNumber || "-"}
                                  </td>
                                  {/* Información Premium de la Empresa */}
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600">
                                    {result.companyName || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600">
                                    {result.companyWebsite || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600">
                                    {result.companyLinkedin || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600">
                                    {result.companyPhoneNumber || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600">
                                    {result.companySize || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600">
                                    {result.industry || "-"}
                                  </td>
                                  <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600">
                                    {result.city || "-"}
                                  </td>
                                </>
                              )}
                              {scrapingResults.length > 0 && (
                                <td className="px-3 py-4 whitespace-nowrap text-sm text-orange-600">
                                  {result.businessModel || "-"}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
