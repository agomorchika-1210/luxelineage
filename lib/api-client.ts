// API client utilities for making authenticated requests

const API_BASE = '/api'

// Get auth token from Supabase Auth
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return session.access_token
    }
  } catch (error) {
    console.error('Failed to get auth token:', error)
  }
  
  return null
}

// Set auth token in localStorage (for backward compatibility)
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
}

// Remove auth token from localStorage
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
}

// Make authenticated API request
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// Auth API
export const authApi = {
  login: async (accessToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })

      // Get response text first to see what we're dealing with
      const responseText = await response.text()
      
      if (!response.ok) {
        let errorData: any = { error: 'Login failed' }
        
        // Try to parse as JSON
        try {
          errorData = JSON.parse(responseText)
        } catch (e) {
          // If not JSON, use the raw text
          errorData = { error: responseText || `HTTP ${response.status}: ${response.statusText}` }
        }
        
        const errorMessage = errorData.error || `Login failed with status ${response.status}`
        
        console.error('Login API error:', {
          status: response.status,
          statusText: response.statusText,
          statusCode: response.status,
          responseText: responseText,
          errorData: errorData,
          headers: Object.fromEntries(response.headers.entries())
        })
        
        throw new Error(errorMessage)
      }

      // Parse successful response
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        throw new Error('Invalid JSON response from server')
      }
      
      if (data.token) {
        setAuthToken(data.token)
      }
      return data
    } catch (error: any) {
      // Re-throw with more context if it's not already an Error
      if (error instanceof Error) {
        console.error('Login error details:', {
          message: error.message,
          stack: error.stack
        })
        throw error
      }
      throw new Error(error.message || 'Network error during login')
    }
  },
  logout: () => {
    removeAuthToken()
  },
}

// Products API
export const productsApi = {
  getAll: () => apiRequest<any[]>('/products'),
  getById: (id: string) => apiRequest<any>(`/products/${id}`),
  create: (product: any) => apiRequest<any>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  update: (id: string, product: any) => apiRequest<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  updateStock: (id: string, quantity: number) => apiRequest<any>(`/products/${id}/stock`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  }),
}

// Orders API
export const ordersApi = {
  getAll: (status?: string) => {
    const url = status ? `/orders?status=${status}` : '/orders'
    return apiRequest<any[]>(url)
  },
  create: (order: any) => apiRequest<any>('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  }),
  process: (id: string) => apiRequest<any>(`/orders/${id}/process`, {
    method: 'POST',
  }),
}

// Sales API
export const salesApi = {
  getAll: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const url = `/sales${params.toString() ? `?${params.toString()}` : ''}`
    return apiRequest<{ sales: any[]; summary: any }>(url)
  },
  createPOS: (sale: { items: any[]; total: number }) => apiRequest<any>('/sales/pos', {
    method: 'POST',
    body: JSON.stringify(sale),
  }),
}

// Notifications API
export const notificationsApi = {
  getAll: () => apiRequest<any[]>('/notifications'),
}

// Admin Users API
export const usersApi = {
  getAll: () => apiRequest<any[]>('/admin/users'),
  getById: (id: string) => apiRequest<any>(`/admin/users/${id}`),
  create: (user: { email: string; role: string; firebaseUid: string }) => apiRequest<any>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }),
  update: (id: string, user: { email?: string; role?: string }) => apiRequest<any>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  }),
  delete: (id: string) => apiRequest<any>(`/admin/users/${id}`, {
    method: 'DELETE',
  }),
}


