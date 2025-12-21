"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin-sidebar"
import { AdminHeader } from "@/components/admin-header"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === "/admin/login"
  const isSignupPage = pathname === "/admin/signup"

  useEffect(() => {
    // Don't redirect if we're on the login or signup page
    if (!isLoginPage && !isSignupPage && !loading && !isAuthenticated) {
      router.push("/admin/login")
    }
  }, [isAuthenticated, loading, router, isLoginPage, isSignupPage])

  // Show loading state
  if (loading && !isLoginPage && !isSignupPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // If on login or signup page, render without layout
  if (isLoginPage || isSignupPage) {
    return <>{children}</>
  }

  // If not authenticated and not on login page, show nothing (redirect will happen)
  if (!isAuthenticated) {
    return null
  }

  // Authenticated - show full admin layout
  return (
    <div className="min-h-screen flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6 bg-muted/30">{children}</main>
      </div>
    </div>
  )
}
