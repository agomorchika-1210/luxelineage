"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { User } from "@supabase/supabase-js"
import { authApi } from "@/lib/api-client"

interface Admin {
  id: string
  email: string
  supabaseUid: string
}

interface AuthContextType {
  user: User | null
  admin: Admin | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, role?: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        syncAdmin(session.user)
      } else {
        setUser(null)
        setAdmin(null)
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await syncAdmin(session.user)
      } else {
        setUser(null)
        setAdmin(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const syncAdmin = async (supabaseUser: User) => {
    try {
      // Only sync if we don't already have admin data
      // This prevents unnecessary API calls on every auth state change
      if (!admin || admin.supabaseUid !== supabaseUser.id) {
        // Get the session token
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const response = await authApi.login(session.access_token)
          if (response.admin) {
            setAdmin(response.admin)
          }
        }
      }
    } catch (error: any) {
      console.error("Failed to sync admin:", error)
      // Don't clear admin on sync failure - might be a temporary network issue
      // Only clear if it's an authentication error
      if (error.message?.includes('Invalid') || error.message?.includes('expired')) {
        setAdmin(null)
      }
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message || "Login failed")
      }

      if (!data.user) {
        throw new Error("No user returned from login")
      }

      // Get session token and sync with backend
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        const response = await authApi.login(session.access_token)
        if (response.admin) {
          setAdmin(response.admin)
        }
      }
    } catch (error: any) {
      throw new Error(error.message || "Login failed")
    }
  }

  const signup = async (email: string, password: string, role?: string) => {
    try {
      // Call signup API endpoint
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      // After successful signup, automatically sign in
      await login(email, password)
    } catch (error: any) {
      throw new Error(error.message || "Signup failed")
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      authApi.logout()
      setAdmin(null)
    } catch (error: any) {
      throw new Error(error.message || "Logout failed")
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user && !!admin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
