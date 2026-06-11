'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, LogIn, UserRound, ShieldCheck, Activity, MapPin } from 'lucide-react'
import { useAuthStore, type User } from '@/lib/authStore'

type LoginResponse = {
  success?: boolean
  message?: string
  token?: string
  user?: User
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

// Stat items shown on the left hero panel
const heroStats = [
  { value: '10.123', label: 'Faskes Terdaftar', icon: Activity },
  { value: '34', label: 'Provinsi Terevaluasi', icon: MapPin },
  { value: '72%', label: 'Tingkat Kepatuhan', icon: ShieldCheck },
]

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isInitialized, initialize, login } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loginEndpoint = useMemo(() => {
    const baseUrl = normalizeBaseUrl(
      process.env.NEXT_PUBLIC_SIPKK_API_BASE_URL || 'http://localhost/sipkk-baru'
    )
    return `${baseUrl}/auth/login-api`
  }, [])

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/')
    }
  }, [isInitialized, isAuthenticated, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const cleanUsername = username.trim()
    if (!cleanUsername || !password) {
      setError('Username dan password wajib diisi.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json',
        },
        body: new URLSearchParams({ username: cleanUsername, password }).toString(),
      })

      const payload = (await response.json().catch(() => null)) as LoginResponse | null

      if (!response.ok || !payload?.success || !payload.token || !payload.user) {
        throw new Error(payload?.message || 'Login gagal. Periksa kembali username dan password.')
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
    <div className="relative grid min-h-screen overflow-hidden bg-[#f0f7f7] lg:grid-cols-[minmax(0,1fr)_520px]">

      {/* ── LEFT: Hero Panel ──────────────────────────────────────────────── */}
      <div className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col">
        {/* Background image */}
        <Image
          src="/pkk.png"
          alt="Dashboard fasilitas kesehatan"
          fill
          priority
          sizes="60vw"
          className="object-cover object-center"
        />

        {/* Overlay gradient — matches dashboard's teal palette */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950/80 via-teal-900/65 to-[#0e6b65]/50" />

        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,1) 39px,rgba(255,255,255,1) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,1) 39px,rgba(255,255,255,1) 40px)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/Logo-Kemenkes.png"
              alt="Logo Kementerian Kesehatan"
              width={160}
              height={58}
              className="h-auto w-[160px] brightness-0 invert"
              priority
            />
          </div>

          {/* Main copy */}
          <div className="max-w-xl pb-4">
            <h1 className="mt-4 text-[42px] font-extrabold leading-[1.1] tracking-tight text-white xl:text-[52px]">
              Indikator Penilaian<br />
              <span className="text-teal-300">Kinerja Faskes</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-teal-100/80 xl:text-[16px]">
              Sistem pemantauan terpadu untuk melihat capaian, sebaran, dan
              perkembangan fasilitas kesehatan di seluruh wilayah Indonesia.
            </p>

            {/* Stats row */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {heroStats.map(({ value, label, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <Icon className="mb-2 h-5 w-5 text-teal-300" strokeWidth={1.8} />
                  <p className="text-[22px] font-extrabold leading-none text-white xl:text-[26px]">
                    {value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-tight text-teal-200/70">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer credit */}
          <p className="text-[12px] text-teal-300/50">
            © {new Date().getFullYear()} Kementerian Kesehatan Republik Indonesia
          </p>
        </div>
      </div>

      {/* ── RIGHT: Login Panel ────────────────────────────────────────────── */}
      <section className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-5 py-8 sm:px-8 lg:bg-white">
        <div className="w-full max-w-[420px]">

          {/* Mobile-only logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image
              src="/Logo-Kemenkes.png"
              alt="Logo Kementerian Kesehatan"
              width={140}
              height={50}
              className="h-auto w-[140px]"
              priority
            />
          </div>

          {/* Card */}
          <div
            className="w-full rounded-[20px] border border-[#c8dedd] bg-white p-7 shadow-[0_20px_60px_rgba(15,118,110,0.10)] sm:p-8 lg:border-0 lg:shadow-none"
          >
            {/* Header */}
            <div className="mb-7">
              <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
                Masuk Akun
              </span>
              <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[32px]">
                Dashboard Faskes
              </h2>
              <p className="mt-1.5 text-[14px] text-slate-500">
                Silakan masuk untuk mengakses data fasilitas kesehatan.
              </p>
            </div>

            {/* Divider */}
            <div className="mb-6 h-px bg-slate-100" />

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-slate-700">
                  Username
                </label>
                <div
                  className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition-all duration-150 focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                >
                  <UserRound className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Masukkan username"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-slate-700">
                  Password
                </label>
                <div
                  className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition-all duration-150 focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]"
                >
                  <LockKeyhole className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Masukkan password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] font-medium text-red-700">
                  <AlertCircle className="mt-px h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-teal-700 px-4 text-[13px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[0_8px_24px_rgba(15,118,110,0.28)] transition-all hover:bg-teal-800 hover:shadow-[0_10px_28px_rgba(15,118,110,0.36)] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <LogIn className="h-[18px] w-[18px]" />
                )}
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="mt-5 text-center text-[12px] text-slate-400">
            Akses terbatas untuk pengguna yang berwenang.
            <br />Hubungi admin jika mengalami kendala masuk.
          </p>
        </div>
      </section>
    </div>
  )
}