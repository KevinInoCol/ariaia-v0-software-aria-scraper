"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Verifica al usuario en la tabla `usuarios_scraper`
 * – Debe estar Activo y VIP.
 */
interface UserProfile {
  id: string
  nombre_completo: string
  correo_electronico: string
  estado_del_usuario: string
  vip: string
  numero_leads_scrapeados: number
  leads_base_gratuitos: number // Antes era "numero_maximo_leads"
  leads_adicionales_pagados: number // Campo nuevo
  fecha_registro: string
}

async function verifyUserInSupabase(email: string): Promise<UserProfile | null> {
  try {
    const supabaseUrl = "https://urxuebohedbjydwaedua.supabase.co"
    const serviceRoleKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyeHVlYm9oZWRianlkd2FlZHVhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjcwMzg4OCwiZXhwIjoyMDY4Mjc5ODg4fQ.ltU3-hBu3rMs8CraxsROdXkMMWycecYR8s8gBJyFdRw"

    const res = await fetch(
      `${supabaseUrl}/rest/v1/usuarios_scraper?correo_electronico=eq.${encodeURIComponent(email)}`,
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
    const data: UserProfile[] = await res.json()
    if (!data.length) return null

    const user = data[0]
    if (user.estado_del_usuario !== "Activo") return null
    if (user.vip !== "Si") return null

    return user
  } catch {
    return null
  }
}

interface LoginPageProps {
  onLogin?: (userData: any) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      setError("Por favor ingresa tu email")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // Verificar al usuario vía REST
      const user = await verifyUserInSupabase(email.trim())
      if (!user) {
        setError("Acceso denegado. Verifica que tu cuenta esté activa y tenga acceso VIP.")
        return
      }

      // Login successful
      if (onLogin) {
        // Crear objeto con el email ingresado y los datos del usuario
        const userData = {
          ...user,
          email: email.trim(), // Asegurar que el email ingresado se guarde
          correo_electronico: email.trim(), // También en el formato que espera el backend
          // Mantener compatibilidad con el código existente
          id_uuid: user.id, // Mapear id a id_uuid para compatibilidad
          numero_maximo_leads: user.leads_base_gratuitos + user.leads_adicionales_pagados, // Calcular total de leads disponibles
        }
        onLogin(userData)
      }
    } catch (err) {
      console.error("Error during login:", err)
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Enhanced Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-purple-500 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-10 w-24 h-24 bg-indigo-500 rounded-full blur-2xl"></div>
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Welcome Title with enhanced styling */}
          <div className="text-center mb-8">
            <div className="relative">
              <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                ¡Bienvenido al Sistema{" "}
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                  ARIA SCRAPER
                </span>
                !
              </h1>
              {/* Decorative line */}
              <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4"></div>
            </div>
            <p className="text-gray-600 text-base leading-relaxed">
              Inicia sesión para acceder a tu sistema de scraping de forma{" "}
              <span className="text-blue-600 font-semibold">sencilla</span>.
            </p>
          </div>

          {/* ARIA Section with card styling */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/50 mb-8">
            <div className="text-left space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  ARIA
                </h2>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 ml-13">Accede a tu cuenta</h3>
              <p className="text-gray-600 text-sm ml-13 leading-relaxed">
                Conecta con tu sistema de scraping <span className="text-purple-600 font-medium">inteligente</span>
              </p>
            </div>
          </div>

          {/* Enhanced Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <span>📧</span>
                <span>Correo Electrónico</span>
              </Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="pl-12 w-full h-14 border-2 border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 text-base"
                  disabled={isLoading}
                />
                {/* Focus ring effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none"></div>
              </div>
            </div>

            {error && (
              <div className="relative">
                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                  <span className="text-red-500 text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 text-white py-4 px-6 rounded-xl font-semibold h-14 text-base transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl shadow-lg relative overflow-hidden group"
              disabled={isLoading}
            >
              {/* Button shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <span className="relative flex items-center justify-center space-x-2">
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        className="opacity-75"
                      />
                    </svg>
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Iniciar Sesión</span>
                  </>
                )}
              </span>
            </Button>
          </form>

          {/* Enhanced Restricted Access Notice */}
          <div className="text-center mt-8">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-amber-600 text-lg">🔒</span>
                <p className="text-sm font-semibold text-amber-800">Acceso restringido</p>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Solo usuarios <span className="font-semibold">activos</span> con acceso{" "}
                <span className="font-semibold text-purple-700">VIP</span> pueden ingresar al sistema.
              </p>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="flex justify-center space-x-2 mt-6 opacity-30">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.5s" }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>
          </div>
        </div>
      </div>

      {/* Right side - Dynamic ARIA SCRAPER Branding */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        {/* Animated Background Stars */}
        <div className="absolute inset-0">
          {/* Large stars */}
          <div className="absolute top-20 left-20 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div
            className="absolute top-32 right-32 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="absolute top-48 left-1/3 w-1 h-1 bg-purple-300 rounded-full animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-64 right-20 w-2 h-2 bg-pink-300 rounded-full animate-pulse"
            style={{ animationDelay: "1.5s" }}
          ></div>
          <div
            className="absolute bottom-40 left-16 w-1.5 h-1.5 bg-white rounded-full animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute bottom-60 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-pulse"
            style={{ animationDelay: "2.5s" }}
          ></div>
          <div
            className="absolute top-1/2 left-12 w-1 h-1 bg-purple-400 rounded-full animate-pulse"
            style={{ animationDelay: "3s" }}
          ></div>
          <div
            className="absolute top-80 right-12 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"
            style={{ animationDelay: "3.5s" }}
          ></div>

          {/* Floating particles */}
          <div
            className="absolute top-16 left-1/4 w-0.5 h-0.5 bg-white rounded-full opacity-60 animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <div
            className="absolute top-28 right-1/4 w-0.5 h-0.5 bg-blue-200 rounded-full opacity-60 animate-bounce"
            style={{ animationDelay: "0.8s" }}
          ></div>
          <div
            className="absolute bottom-32 left-1/2 w-0.5 h-0.5 bg-purple-200 rounded-full opacity-60 animate-bounce"
            style={{ animationDelay: "1.2s" }}
          ></div>
          <div
            className="absolute bottom-48 right-1/2 w-0.5 h-0.5 bg-pink-200 rounded-full opacity-60 animate-bounce"
            style={{ animationDelay: "1.8s" }}
          ></div>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center h-full p-12 space-y-12">
          {/* ARIA SCRAPER Logo and Branding */}
          <div className="text-center">
            {/* Logo with glow effect */}
            <div className="relative group">
              <div className="w-32 h-32 bg-black rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl transform transition-transform duration-300 group-hover:scale-105">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/678de7d05086324127b72ad6_2-QJUy9a1uVH9X1AVXJPvPlKExR2kuoN.png"
                  alt="ARIA Logo"
                  className="w-20 h-20 object-contain"
                />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 w-32 h-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-3xl blur-xl mx-auto mb-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>

            {/* Text with gradient */}
            <div className="space-y-2 mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent tracking-wide animate-pulse">
                ARIA SCRAPER
              </h1>
              <p className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                SUITE
              </p>
            </div>
          </div>

          {/* Lead Generation Section with enhanced styling */}
          <div className="text-center space-y-6">
            <div className="relative">
              <h2 className="text-2xl font-bold text-white leading-tight mb-4 drop-shadow-lg">
                ✨ Encuentra Leads con nuestro sencillo sistema
              </h2>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg blur opacity-25"></div>
            </div>

            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl">
              <p className="text-lg text-slate-200 leading-relaxed">
                Solo coloca el <span className="text-blue-300 font-semibold">tipo de negocio</span> y la{" "}
                <span className="text-purple-300 font-semibold">localización</span> y obtén tus Leads para que tus
                ventas <span className="text-pink-300 font-semibold">aumenten</span>.
              </p>

              {/* Decorative elements */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-ping"></div>
              <div
                className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-ping"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>

            {/* Call to action indicators */}
            <div className="flex justify-center space-x-4 mt-8">
              <div className="flex items-center space-x-2 text-blue-300">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Rápido</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-300">
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <span className="text-sm font-medium">Sencillo</span>
              </div>
              <div className="flex items-center space-x-2 text-pink-300">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse" style={{ animationDelay: "1s" }}></div>
                <span className="text-sm font-medium">Efectivo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
