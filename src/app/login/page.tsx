'use client'

import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, LogIn, UserRound } from 'lucide-react'
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
    <div className="relative grid min-h-screen overflow-hidden bg-[#f0f7f7] lg:grid-cols-[minmax(0,1fr)_520px]">
      <section className="relative hidden min-h-screen overflow-hidden lg:flex lg:flex-col">
        <Image
          src="/pkk.png"
          alt="Dashboard fasilitas kesehatan"
          fill
          priority
          sizes="60vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-950/80 via-teal-900/65 to-[#0e6b65]/50" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,1) 39px,rgba(255,255,255,1) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,1) 39px,rgba(255,255,255,1) 40px)',
          }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-12 text-white">
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

          <div className="max-w-xl pb-4">
            <h1 className="mt-4 text-[42px] font-extrabold leading-[1.1] tracking-tight text-white xl:text-[52px]">
              Indikator Penilaian
              <br />
              <span className="text-teal-300">Kinerja Faskes</span>
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-teal-100/80 xl:text-[16px]">
              Sistem pemantauan terpadu untuk melihat capaian, sebaran, dan
              perkembangan fasilitas kesehatan di seluruh wilayah Indonesia.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { value: '10.123', label: 'Faskes Terdaftar' },
                { value: '34', label: 'Provinsi Terevaluasi' },
                { value: '72%', label: 'Tingkat Kepatuhan' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <p className="text-[22px] font-extrabold leading-none text-white xl:text-[26px]">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[11px] font-medium leading-tight text-teal-200/70">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[12px] text-teal-300/50">
            © {new Date().getFullYear()} Kementerian Kesehatan Republik Indonesia
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#f0f7f7] px-5 py-8 sm:px-8 lg:bg-white">
        <div className="w-full max-w-[420px]">
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

          <div className="w-full rounded-[20px] border border-[#c8dedd] bg-white p-7 shadow-[0_20px_60px_rgba(15,118,110,0.10)] sm:p-8 lg:border-0 lg:shadow-none">
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

            <div className="mb-6 h-px bg-slate-100" />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold text-slate-700">
                  Username
                </label>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition-all duration-150 focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]">
                  <UserRound className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    disabled={loading}
                    className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Masukkan username"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[13px] font-bold text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[12px] font-semibold text-teal-600 transition-colors hover:text-teal-700 hover:underline"
                  >
                    Lupa password?
                  </Link>
                </div>
                <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition-all duration-150 focus-within:border-teal-500 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(20,184,166,0.12)]">
                  <LockKeyhole className="h-[18px] w-[18px] flex-shrink-0 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={loading}
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-bold text-slate-700">
                  Keamanan (Captcha)
                </label>
                <CaptchaWidget onVerifyChange={setCaptchaVerified} />
              </div>

              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <p>{error}</p>
                </div>
              ) : null}

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

            <div className="mt-4 text-center text-[13px] text-slate-500">
              Belum punya akun?{' '}
              <Link
                href="/register"
                className="font-bold text-teal-600 transition-colors hover:text-teal-700 hover:underline"
              >
                Daftar sebagai Masyarakat
              </Link>
            </div>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Atau
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-[13px] font-extrabold text-teal-700 transition-colors hover:text-teal-800 hover:underline"
              >
                Masuk sebagai Tamu (Akses Publik)
              </Link>
            </div>
          </div>

          <p className="mt-5 text-center text-[12px] text-slate-400">
            Akses terbatas untuk pengguna yang berwenang.
            <br />
            Hubungi admin jika mengalami kendala masuk.
          </p>
        </div>
      </section>
    </div>
  )
}
