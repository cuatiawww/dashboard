'use client'

import { AlertCircle, Eye, EyeOff, LockKeyhole, LogIn, UserRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

import CaptchaWidget from '@/components/auth/CaptchaWidget'
import { useAuthStore, type User } from '@/lib/authStore'

type LoginResponse = {
  success?: boolean
  message?: string
  token?: string
  user?: User
}

export default function LoginPage() {
  const router = useRouter()
  const { initialize, isAuthenticated, isInitialized, login } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captchaVerified, setCaptchaVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, isInitialized, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const cleanUsername = username.trim()

    if (!cleanUsername || !password) {
      setError('Username dan password wajib diisi.')
      return
    }

    if (!captchaVerified) {
      setError('Verifikasi CAPTCHA terlebih dahulu sebelum login.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      })

      const payload = (await response.json()) as LoginResponse

      if (!response.ok || !payload.success || !payload.token || !payload.user) {
        setCaptchaVerified(false)
        throw new Error(payload.message || 'Login gagal.')
      }

      login(payload.token, payload.user)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen overflow-hidden bg-[#eff7f6] lg:grid-cols-[minmax(0,1fr)_540px]">
      <section className="relative hidden overflow-hidden lg:flex">
        <Image
          src="/pkk.png"
          alt="Latar sistem dashboard kesehatan"
          fill
          priority
          sizes="60vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,118,110,0.78),rgba(16,185,129,0.38))]" />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />

        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-between px-12 py-14 text-white">
          <div className="flex items-center gap-4">
            <Image
              src="/Logo-Kemenkes.png"
              alt="Logo Kementerian Kesehatan"
              width={178}
              height={62}
              className="h-auto w-[178px] brightness-0 invert"
              priority
            />
          </div>

          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-teal-100">
              Internal Login
            </span>
            <div className="space-y-4">
              <h1 className="max-w-xl text-5xl font-extrabold leading-[1.02] tracking-tight">
                CAPTCHA internal Next.js untuk proses login yang lebih aman.
              </h1>
              <p className="max-w-lg text-base leading-7 text-teal-50/86">
                CAPTCHA digenerate sebagai SVG, berlaku 2 menit, case-insensitive,
                dan otomatis dihapus setelah divalidasi agar tidak bisa dipakai ulang.
              </p>
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-3">
              {[
                'SVG via svg-captcha',
                'UUID per challenge',
                'One-time use + TTL',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-semibold text-white backdrop-blur-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-teal-50/72">
            Mode demo login. Ganti endpoint `/api/login` dengan autentikasi database Anda.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:bg-white">
        <div className="w-full max-w-[430px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image
              src="/Logo-Kemenkes.png"
              alt="Logo Kementerian Kesehatan"
              width={150}
              height={52}
              className="h-auto w-[150px]"
              priority
            />
          </div>

          <div className="rounded-[28px] border border-[#d9ebe9] bg-white p-7 shadow-[0_24px_80px_rgba(15,118,110,0.12)] sm:p-8">
            <div className="mb-6">
              <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">
                Sign In
              </span>
              <h2 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight text-slate-900">
                Dashboard Faskes
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Login contoh dengan CAPTCHA internal App Router.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-slate-700">
                  Username
                </label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]">
                  <UserRound className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Masukkan username"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-slate-700">
                  Password
                </label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]">
                  <LockKeyhole className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="text-slate-400 transition hover:text-teal-700"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              <CaptchaWidget onVerifyChange={setCaptchaVerified} />

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                {loading ? 'Memproses login...' : 'Login'}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-700">Kredensial demo</p>
              <p>Username: `admin`</p>
              <p>Password: `demo12345`</p>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              <Link href="/" className="font-semibold text-teal-700 hover:text-teal-800">
                Kembali ke beranda
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
