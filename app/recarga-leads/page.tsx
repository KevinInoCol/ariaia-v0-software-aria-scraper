"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CreditCard, Zap, Star, Users } from "lucide-react"
import { useRouter } from "next/navigation"

export default function RecargaLeadsPage() {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const plans = [
    {
      id: "basic",
      name: "Básico",
      price: "$30",
      leads: "2,500",
      popular: false,
      color: "border-gray-200",
    },
    {
      id: "professional",
      name: "Profesional",
      price: "$60",
      leads: "5,000",
      popular: true,
      color: "border-blue-500",
    },
    {
      id: "enterprise",
      name: "Empresarial",
      price: "$90",
      leads: "10,000",
      popular: false,
      color: "border-purple-500",
    },
  ]

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)

    if (planId === "basic") {
      // Open the basic plan payment page in a new tab
      window.open("https://app.sistema-ia.com/v2/preview/x16WvgS1ah6f4cfQrMQ5?notrack=true", "_blank")
    } else if (planId === "professional") {
      // Open the professional plan payment page in a new tab
      window.open("https://app.sistema-ia.com/v2/preview/zQUMLhmYxodJJ2AfPyxm?notrack=true", "_blank")
    } else if (planId === "enterprise") {
      // Open the enterprise plan payment page in a new tab
      window.open("https://app.sistema-ia.com/v2/preview/oSy7kaUA0HOFWNRgodxI", "_blank")
    } else {
      // For other plans, keep the existing logic
      console.log(`Plan seleccionado: ${planId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/678de7d05086324127b72ad6_2-QJUy9a1uVH9X1AVXJPvPlKExR2kuoN.png"
                    alt="ARIA Logo"
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div>
                  <div className="font-bold text-lg text-gray-900">ARIA SCRAPER</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Recarga de Leads
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Amplía tu capacidad de generación de leads con nuestros planes flexibles. Obtén más datos.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">50,000+</div>
                <div className="text-sm text-gray-600">Leads generados</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">98%</div>
                <div className="text-sm text-gray-600">Precisión de datos</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">24/7</div>
                <div className="text-sm text-gray-600">Escrapeo disponible a toda hora</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative transition-all duration-300 hover:shadow-xl ${plan.color} ${
                plan.popular ? "ring-2 ring-blue-500 scale-105" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">Más Popular</Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1 mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                </div>
                <CardDescription className="text-lg font-semibold text-blue-600 mt-2">
                  {plan.leads} leads incluidos
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <Button
                  className={`w-full py-3 ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Seleccionar Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
