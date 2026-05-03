// API client utilities for making authenticated requests
// ============================================================================
// SIMPLIFIED API CLIENT
// ============================================================================
// Design principles:
// 1. Trust Supabase - it handles token refresh automatically
// 2. Simple error handling - fail fast, don't hang
// 3. No manual timeouts for auth - let Supabase handle it
// ============================================================================

const API_BASE = '/api'

// Get auth token from Supabase Auth - simple version
export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  
  try {
    const { supabase } = await import('@/lib/supabase')
    
    // Supabase handles token refresh automatically with autoRefreshToken: true
    // Just get the current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.access_token) {
      return null
    }
    
    return session.access_token
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
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

// Make authenticated API request - simplified
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for slow connections

  try {
    // Get token - simple, no racing
    const token = await getAuthToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeoutId)
  }
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
  // Public fetch (no auth) to avoid blocking shop page on auth token lookups
  getAll: async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s safeguard

    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      return res.json()
    } finally {
      clearTimeout(timeoutId)
    }
  },
  list: async (options?: { q?: string; page?: number; pageSize?: number; ids?: string[] }) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s safeguard

    try {
      const params = new URLSearchParams()
      if (options?.q) params.set('q', options.q)
      if (options?.page) params.set('page', String(options.page))
      if (options?.pageSize) params.set('pageSize', String(options.pageSize))
      if (options?.ids && options.ids.length > 0) params.set('ids', options.ids.join(','))

      const res = await fetch(`${API_BASE}/products${params.toString() ? `?${params.toString()}` : ''}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      return res.json() as Promise<{
        items: any[]
        total: number
        page: number
        pageSize: number
        q?: string
      }>
    } finally {
      clearTimeout(timeoutId)
    }
  },
  getById: async (id: string) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      return res.json()
    } finally {
      clearTimeout(timeoutId)
    }
  },
  getByIds: async (ids: string[]) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      const params = new URLSearchParams()
      if (ids.length > 0) params.set('ids', ids.join(','))
      const res = await fetch(`${API_BASE}/products${params.toString() ? `?${params.toString()}` : ''}`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      return res.json()
    } finally {
      clearTimeout(timeoutId)
    }
  },
  create: (product: any) => apiRequest<any>('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  update: (id: string, product: any) => apiRequest<any>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  delete: (id: string) => apiRequest<any>(`/products/${id}`, {
    method: 'DELETE',
  }),
  updateStock: (id: string, action: 'increase' | 'decrease', quantity: number) => apiRequest<any>(`/products/${id}/stock`, {
    method: 'POST',
    body: JSON.stringify({ action, quantity }),
  }),
}

// Orders API
export const ordersApi = {
  getAll: (status?: string, source?: string, startDate?: string, endDate?: string, search?: string) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (source) params.append('source', source)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (search) params.append('search', search)
    const url = `/orders${params.toString() ? `?${params.toString()}` : ''}`
    return apiRequest<any[]>(url)
  },
  create: (order: any, idempotencyKey?: string) => apiRequest<any>('/orders', {
    method: 'POST',
    headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
    body: JSON.stringify(order),
  }),
  process: (id: string) => apiRequest<any>(`/orders/${id}/process`, {
    method: 'POST',
  }),
  ship: (id: string) => apiRequest<any>(`/orders/${id}/ship`, {
    method: 'POST',
  }),
  deliver: (id: string) => apiRequest<any>(`/orders/${id}/deliver`, {
    method: 'POST',
  }),
  cancel: (id: string, reason?: string, refundAmount?: number) => apiRequest<any>(`/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason, refundAmount }),
  }),
  getReceipt: (id: string) => apiRequest<any>(`/orders/${id}/receipt`),
}

/** Stripe Checkout session + guest order lookup (no admin auth). */
export const checkoutApi = {
  createStripeSession: async (
    body: {
      items: { productId: string; quantity: number }[]
      customerName?: string
      customerEmail: string
      customerPhone?: string
      shippingAddress?: string
    },
    idempotencyKey: string
  ) => {
    const res = await fetch(`${API_BASE}/checkout/stripe-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
    }
    return data as { url: string; sessionId?: string; resumed?: boolean }
  },
  getOrderFromSession: async (sessionId: string) => {
    const res = await fetch(
      `${API_BASE}/checkout/order-from-session?session_id=${encodeURIComponent(sessionId)}`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || `HTTP ${res.status}`)
    }
    return res.json() as Promise<{ pending: boolean; order?: any }>
  },
}

/** Guest order status by ID + email (must match order). */
export async function trackGuestOrder(orderId: string, email: string) {
  const params = new URLSearchParams({ orderId, email })
  const res = await fetch(`${API_BASE}/orders/track?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  return data
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
  createPOS: (sale: {
    items: any[]
    total: number
    amountTendered?: number
  }) =>
    apiRequest<any>('/sales/pos', {
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

// P&L API
export const plApi = {
  get: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const url = `/pl${params.toString() ? `?${params.toString()}` : ''}`
    return apiRequest<any>(url)
  },
}

// Expenses API
export const expensesApi = {
  getAll: (startDate?: string, endDate?: string, category?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (category) params.append('category', category)
    const url = `/expenses${params.toString() ? `?${params.toString()}` : ''}`
    return apiRequest<{ expenses: any[]; summary: any }>(url)
  },
  create: (expense: { category: string; description: string; amount: number; date?: string }) => apiRequest<any>('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  }),
  update: (id: string, expense: { category?: string; description?: string; amount?: number; date?: string }) => apiRequest<any>(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(expense),
  }),
  delete: (id: string) => apiRequest<any>(`/expenses/${id}`, {
    method: 'DELETE',
  }),
}

// Returns API
export const returnsApi = {
  getAll: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    const url = `/returns${params.toString() ? `?${params.toString()}` : ''}`
    return apiRequest<{ returns: any[]; summary: any }>(url)
  },
  create: (returnData: { orderId: string; items: Array<{ productId: string; quantity: number }>; reason?: string; refundAmount?: number }) => apiRequest<any>('/returns', {
    method: 'POST',
    body: JSON.stringify(returnData),
  }),
}

// Balance Sheet API
export const balanceSheetApi = {
  get: () => apiRequest<any>('/balance-sheet'),
}

// Assets API
export const assetsApi = {
  getAll: () => apiRequest<{ assets: any[] }>('/assets'),
  create: (asset: { type: string; name: string; description?: string; value: number; date?: string }) => apiRequest<any>('/assets', {
    method: 'POST',
    body: JSON.stringify(asset),
  }),
  update: (id: string, asset: { type?: string; name?: string; description?: string; value?: number; date?: string }) => apiRequest<any>(`/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(asset),
  }),
  delete: (id: string) => apiRequest<any>(`/assets/${id}`, {
    method: 'DELETE',
  }),
}

// Liabilities API
export const liabilitiesApi = {
  getAll: () => apiRequest<{ liabilities: any[] }>('/liabilities'),
  create: (liability: { type: string; name: string; description?: string; amount: number; date?: string }) => apiRequest<any>('/liabilities', {
    method: 'POST',
    body: JSON.stringify(liability),
  }),
  update: (id: string, liability: { type?: string; name?: string; description?: string; amount?: number; date?: string }) => apiRequest<any>(`/liabilities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(liability),
  }),
  delete: (id: string) => apiRequest<any>(`/liabilities/${id}`, {
    method: 'DELETE',
  }),
}


