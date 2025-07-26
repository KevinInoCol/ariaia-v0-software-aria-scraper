"use client"

import { useState, useEffect } from "react"
import BusinessSearch from "../business-search"
import LoginPage from "./login/page"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const userData = localStorage.getItem("aria_user_data")
    if (userData) {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (userData: any) => {
    localStorage.setItem("aria_user_data", JSON.stringify(userData))
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("aria_user_data")
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />
  }

  return <BusinessSearch onLogout={handleLogout} />
}
