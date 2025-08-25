"use client"

import { useState, useEffect } from "react"
import { Settings, Search, Info } from "lucide-react"
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

  const [activeSection, setActiveSection] = useState("leads") // Default to leads section
  const [showLinkedInSection, setShowLinkedInSection] = useState(false)

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
      // Modelo de Negocio - solo cuando getBusinessModel = true
      ...(getBusinessModel ? ["Modelo de Negocio"] : []),
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

        const businessModelData = getBusinessModel ? [`"${(result.businessModel || "-").replace(/"/g, '""')}"`] : []

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

    setIsLoading(true)
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

      const response = await fetch("https://software-aria-software-scraper.0ogkj4.easypanel.host/start-scraping", {
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

      // Intentar obtener los resultados del scraping
      const responseData = await response.json().catch(() => null)
      console.log("Datos recibidos:", responseData)

      // Si la respuesta contiene resultados, mostrarlos y actualizar el contador
      if (responseData && responseData.data && Array.isArray(responseData.data)) {
        setScrapingResults(responseData.data)
        const count = responseData.results_count || responseData.data.length
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
              }
            }
          } catch (error) {
            console.error("Error al actualizar contador desde DB:", error)
          }
        }

        // Actualizar el contador de leads scrapeados
        setLeadsScrapedCount((prev) => prev + count)
        // Actualizar leads restantes
        setRemainingLeads((prev) => Math.max(0, prev - count))
      } else if (responseData && Array.isArray(responseData.results)) {
        setScrapingResults(responseData.results)
        setSuccess(`Scraping completado exitosamente. ${responseData.results.length} resultados encontrados.`)

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
              }
            }
          } catch (error) {
            console.error("Error al actualizar contador desde DB:", error)
          }
        }

        // Actualizar el contador de leads scrapeados
        setLeadsScrapedCount((prev) => prev + responseData.results.length)
        // Actualizar leads restantes
        setRemainingLeads((prev) => Math.max(0, prev - responseData.results.length))
      } else if (responseData && Array.isArray(responseData)) {
        setScrapingResults(responseData)
        setSuccess(`Scraping completado exitosamente. ${responseData.length} resultados encontrados.`)

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
              }
            }
          } catch (error) {
            console.error("Error al actualizar contador desde DB:", error)
          }
        }

        // Actualizar el contador de leads scrapeados
        setLeadsScrapedCount((prev) => prev + responseData.length)
        // Actualizar leads restantes
        setRemainingLeads((prev) => Math.max(0, prev - responseData.length))
      } else {
        setSuccess("Datos enviados al webhook exitosamente")
      }
    } catch (err) {
      console.error("Error completo:", err)
      setError(
        `Error de conexión: ${err instanceof Error ? err.message : "Error desconocido"}. Verifica la URL del webhook y tu conexión.`,
      )
    } finally {
      setIsLoading(false)
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
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo - Reorganizado verticalmente */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/678de7d05086324127b72ad6_2-QJUy9a1uVH9X1AVXJPvPlKExR2kuoN.png"
                alt="ARIA Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-xl text-gray-900">ARIA SCRAPER</div>
              <div className="text-base text-blue-600 font-semibold">SUITE</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <div className="space-y-2">
            <div
              className={`flex items-center gap-2 text-sm mb-4 cursor-pointer transition-colors rounded-lg p-3 ${
                activeSection === "recharge"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
              onClick={() => {
                // Navigate to internal recarga leads page
                router.push("/recarga-leads")
              }}
            >
              <Settings className="w-4 h-4" />
              <span>Recarga de Leads</span>
            </div>

            <div
              className={`rounded-lg p-3 mt-6 cursor-pointer transition-colors ${
                activeSection === "leads" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => {
                setShowLeadsDropdown(!showLeadsDropdown)
                setActiveSection("leads")
              }}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Search className="w-4 h-4" />
                <span>Búsqueda de Leads</span>
                <ChevronDown
                  className={`w-4 h-4 ml-auto transition-transform ${showLeadsDropdown ? "rotate-0" : "-rotate-90"}`}
                />
              </div>
            </div>

            {showLeadsDropdown && (
              <div className="pl-4 space-y-2 text-sm text-gray-500 mt-2">
                <div className="text-blue-600 font-medium cursor-pointer hover:text-blue-800 transition-colors py-1">
                  Nueva Búsqueda
                </div>
                <div className="cursor-pointer hover:text-gray-700 transition-colors py-1 mb-4">Listas Guardadas</div>

                {/* Contador de Leads Scrapeados */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mt-4 border border-blue-100">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-600 mb-1">Scrapeaste:</div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{leadsScrapedCount.toLocaleString()}</div>
                    <div className="text-xs text-gray-600 leading-tight mb-4">
                      Número de Leads Scrapeados mapeados por el Sistema ARIA SCRAPER
                    </div>

                    {/* Línea divisoria sutil */}
                    <div className="w-full h-px bg-gray-200 my-4"></div>

                    {/* Nuevo contador de leads restantes */}
                    <div className="mt-4">
                      <div className="text-sm font-medium text-green-600 mb-1">Te quedan:</div>
                      <div className="text-2xl font-bold text-green-600 mb-2">{remainingLeads.toLocaleString()}</div>
                      <div className="text-xs text-gray-600 leading-tight">
                        Número de Leads scrapeables restantes en tu cuenta
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Nueva sección de LinkedIn */}
            <div
              className={`rounded-lg p-3 mt-4 cursor-pointer transition-colors ${
                activeSection === "linkedin" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => {
                setActiveSection("linkedin")
                setShowLinkedInSection(true)
                setShowLeadsDropdown(false) // Cerrar el dropdown de leads
              }}
            >
              <div className="flex items-center gap-2 font-semibold">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span>Envío de Conexion por LinkedIn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button - Bottom of Sidebar */}
        <div className="p-4 border-t border-gray-200 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              console.log("Cerrando sesión...")
              if (onLogout) {
                onLogout()
              }
            }}
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-transparent transition-colors"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white overflow-y-auto">
        {activeSection === "linkedin" ? (
          /* Contenido de LinkedIn */
          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Envío de Conexión por LinkedIn
                </h1>
              </div>
              <p className="text-gray-600 text-sm ml-5 font-medium">
                Automatiza el envío de solicitudes de conexión en LinkedIn
              </p>
            </div>

            {/* Formulario de credenciales de LinkedIn */}
            <div className="max-w-2xl space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Credenciales de LinkedIn</h2>

                <div className="space-y-4">
                  {/* Campo Username */}
                  <div>
                    <Label htmlFor="linkedin-username" className="text-sm font-medium text-gray-700 mb-2 block">
                      Username de LinkedIn
                    </Label>
                    <Input
                      id="linkedin-username"
                      type="text"
                      placeholder="tu-email@ejemplo.com"
                      className="w-full"
                      value={linkedinUsername}
                      onChange={(e) => setLinkedinUsername(e.target.value)}
                      disabled={isLinkedinLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ingresa el email o username que usas para iniciar sesión en LinkedIn
                    </p>
                  </div>

                  {/* Campo Password */}
                  <div>
                    <Label htmlFor="linkedin-password" className="text-sm font-medium text-gray-700 mb-2 block">
                      Password de LinkedIn
                    </Label>
                    <Input
                      id="linkedin-password"
                      type="password"
                      placeholder="••••••••"
                      className="w-full"
                      value={linkedinPassword}
                      onChange={(e) => setLinkedinPassword(e.target.value)}
                      disabled={isLinkedinLoading}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tu contraseña será encriptada y almacenada de forma segura
                    </p>
                  </div>
                </div>

                {/* Nota de seguridad */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">Información de Seguridad</p>
                    <p>
                      Tus credenciales de LinkedIn son almacenadas de forma segura y encriptada. Solo se utilizan para
                      automatizar el envío de conexiones según tu configuración.
                    </p>
                  </div>
                </div>

                {/* Mensajes de error y éxito */}
                {linkedinError && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                    {linkedinError}
                  </div>
                )}

                {linkedinSuccess && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200">
                    {linkedinSuccess}
                  </div>
                )}

                {/* Botón de guardar credenciales */}
                <div className="mt-6">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 disabled:opacity-50"
                    onClick={handleSaveLinkedinCredentials}
                    disabled={isLinkedinLoading || !linkedinUsername.trim() || !linkedinPassword.trim()}
                  >
                    {isLinkedinLoading ? "Guardando..." : "Guardar Credenciales"}
                  </Button>
                </div>
              </div>

              {/* Sección adicional para futuras funcionalidades */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Próximamente</h3>
                <p className="text-gray-600">
                  Una vez guardadas las credenciales, podrás configurar campañas automáticas de conexión.
                </p>
              </div>
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
              {/* Segunda fila: Checkbox + Nota amarilla a la izquierda, High Level + Mapa a la derecha */}
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
                  {/* Nuevo checkbox para modelo de negocio */}
                  <div className="flex items-center space-x-2 mt-3">
                    <Checkbox
                      id="get-business-model"
                      checked={getBusinessModel}
                      onCheckedChange={(checked) => setGetBusinessModel(checked === true)}
                    />
                    <Label htmlFor="get-business-model" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Obtener el modelo de negocio de la empresa o lead scrapeado
                    </Label>
                  </div>
                  {/* Nota informativa sobre el modelo de negocio */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <p>
                        Solo se obtendrá el modelo de negocio si la empresa o lead scrapeada tiene disponible su website
                        o sitio web
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

              {error && error !== "LIMIT_REACHED" && (
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
                            {getBusinessModel && (
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
                            {getBusinessModel && (
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
                              {getBusinessModel && (
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
