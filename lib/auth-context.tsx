"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { User, Session } from "@supabase/supabase-js"

// ============================================================================
// SIMPLIFIED AUTH CONTEXT
// ============================================================================
// Design principles:
// 1. Single source of truth - one auth state listener
// 2. Trust Supabase - let it handle token refresh automatically
// 3. Simple flow - no competing operations, no race conditions
// 4. Clear error handling - fail fast, don't hang
// ============================================================================

interface Admin {
  id: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  admin: Admin | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, role?: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  // Sync admin with backend - simple, no guards needed
  const syncAdmin = useCallback(async (session: Session): Promise<Admin | null> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: session.access_token }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.warn('Admin sync failed:', data.error || response.statusText)
        return null
      }

      const data = await response.json()
      return data.admin || null
    } catch (err: any) {
      console.error('Admin sync error:', err.message)
      return null
    }
  }, [])

  // Handle auth state changes - single listener, simple logic
  useEffect(() => {
    let mounted = true

    // Single auth state listener - handles everything
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth event:', event, { hasSession: !!session })

        // Handle different events
        switch (event) {
          case 'INITIAL_SESSION':
            // First load - check if user is already logged in
            if (session?.user) {
              setUser(session.user)
              const adminData = await syncAdmin(session)
              if (mounted) {
                setAdmin(adminData)
                setLoading(false)
                setInitialized(true)
              }
            } else {
              // No session - user is logged out
              setUser(null)
              setAdmin(null)
              setLoading(false)
              setInitialized(true)
            }
            break

          case 'SIGNED_IN':
            // User just signed in
            if (session?.user) {
              setUser(session.user)
              // Only sync if not already initialized (avoid double sync on login)
              if (!initialized) {
                const adminData = await syncAdmin(session)
                if (mounted) setAdmin(adminData)
              }
              if (mounted) setLoading(false)
            }
            break

          case 'SIGNED_OUT':
            // User signed out - clear everything
            setUser(null)
            setAdmin(null)
            setLoading(false)
            setError(null)
            break

          case 'TOKEN_REFRESHED':
            // Token was refreshed by Supabase - just update user
            if (session?.user) {
              setUser(session.user)
            }
            break

          case 'USER_UPDATED':
            // User profile updated
            if (session?.user) {
              setUser(session.user)
            }
            break
        }
      }
    )

    // Cleanup
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [syncAdmin, initialized])

  // Login function - simple and direct
  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    setLoading(true)

    try {
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw new Error(signInError.message)
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed - no user data returned')
      }

      // Set user immediately
      setUser(data.user)

      // Sync admin with backend
      const adminData = await syncAdmin(data.session)
      
      if (!adminData) {
        // User exists in Supabase but not as admin
        // This is not necessarily an error - they might not be an admin
        console.warn('User logged in but no admin record found')
      }
      
      setAdmin(adminData)
      setLoading(false)
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Login failed')
      throw err // Re-throw so the UI can handle it
    }
  }, [syncAdmin])

  // Signup function
  const signup = useCallback(async (email: string, password: string, role?: string) => {
    setError(null)
    setLoading(true)

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

      // After successful signup, sign in
      await login(email, password)
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Signup failed')
      throw err
    }
  }, [login])

  // Logout function - simple and clean
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      // State will be cleared by onAuthStateChange SIGNED_OUT event
    } catch (err: any) {
      console.error('Logout error:', err)
      // Force clear state even if signOut fails
      setUser(null)
      setAdmin(null)
      setError(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        admin,
        loading,
        error,
        login,
        signup,
        logout,
        clearError,
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
