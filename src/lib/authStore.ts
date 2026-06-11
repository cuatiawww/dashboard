import { create } from 'zustand'

export interface User {
  id_user: number
  username: string
  email: string
  nama_lengkap: string
  level_user_id: number
  level_name?: string
  wilayah_scope?: WilayahScope
}

export type WilayahScopeMode = 'all' | 'provinsi' | 'kabupaten'

export interface WilayahScopeOption {
  id?: number | null
  value?: string
  label: string
  locked: boolean
  options?: Array<{
    id: number
    label: string
  }>
}

export interface WilayahScope {
  mode: WilayahScopeMode
  access_label: string
  cakupan: WilayahScopeOption
  provinsi: WilayahScopeOption
  kabupaten: WilayahScopeOption
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isInitialized: boolean
  login: (token: string, user: User) => void
  logout: () => void
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  login: (token, user) => {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },
  logout: () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    set({ token: null, user: null, isAuthenticated: false })
  },
  initialize: () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('auth_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ token, user, isAuthenticated: true, isInitialized: true })
      } catch (e) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        set({ token: null, user: null, isAuthenticated: false, isInitialized: true })
      }
    } else {
      set({ isInitialized: true })
    }
  }
}))
