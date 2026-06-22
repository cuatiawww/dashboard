'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, type User } from '@/lib/authStore'
import { Loader2, AlertCircle } from 'lucide-react'

export default function SsoPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Parse params manually on mount to avoid Next.js Suspense de-opts
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const userBase64 = params.get('user')

    if (!token || !userBase64) {
      setError('Parameter autentikasi SSO tidak lengkap atau salah.')
      return
    }

    try {
      // Safely decode UTF-8 JSON from base64
      let decodedUserStr
      try {
        decodedUserStr = decodeURIComponent(escape(window.atob(userBase64)))
      } catch (e) {
        decodedUserStr = window.atob(userBase64)
      }
      
      const user = JSON.parse(decodedUserStr) as User
      
      // Perform login
      login(token, user)
      
      // Redirect to home
      router.replace('/')
    } catch (err) {
      console.error('SSO parsing error:', err)
      setError('Gagal membaca data sesi SSO. Silakan login manual.')
    }
  }, [login, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f7f7] p-4 text-center">
      <div className="w-full max-w-[420px] rounded-3xl border border-[#c8dedd] bg-white p-8 shadow-[0_20px_60px_rgba(15,118,110,0.10)]">
        {error ? (
          <div className="space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900">Autentikasi Gagal</h2>
            <p className="text-sm text-slate-500">{error}</p>
            <div className="pt-2">
              <a
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-700 px-6 text-sm font-bold text-white hover:bg-teal-800 transition"
              >
                Kembali ke Login
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-700" />
            <h2 className="text-xl font-bold text-slate-900">Menghubungkan Sesi...</h2>
            <p className="text-sm text-slate-500">
              Mohon tunggu, kami sedang mentransfer sesi login Anda dengan aman.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
