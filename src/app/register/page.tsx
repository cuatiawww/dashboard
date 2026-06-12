'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, UserPlus, ArrowLeft, Building2, Briefcase, MapPin, Phone, Mail, UserRound, LockKeyhole, KeyRound, Check, X } from 'lucide-react'

type Region = {
  id: number
  name: string
}

type RegisterResponse = {
  success?: boolean
  registration_id?: number
  message?: string
  errors?: Record<string, string>
}

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

export default function RegisterPage() {
  const router = useRouter()

  // Base API configuration
  const baseApiUrl = useMemo(() => {
    const baseUrl = normalizeBaseUrl(
      process.env.NEXT_PUBLIC_SIPKK_API_BASE_URL || 'http://localhost/sipkk-baru'
    )
    return baseUrl
  }, [])

  // Flow State: 'form' | 'otp' | 'success'
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form')
  const [registrationId, setRegistrationId] = useState<number | null>(null)

  // Form states
  const [namaLengkap, setNamaLengkap] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [telp, setTelp] = useState('')
  const [kategoriAkses, setKategoriAkses] = useState('masyarakat_umum')
  const [alamatUser, setAlamatUser] = useState('')
  const [provinsiId, setProvinsiId] = useState('')
  const [kabupatenId, setKabupatenId] = useState('')
  const [tujuanAkses, setTujuanAkses] = useState('riset_analisa')
  const [tujuanAksesLainnya, setTujuanAksesLainnya] = useState('')
  const [namaInstitusi, setNamaInstitusi] = useState('')
  const [pekerjaanPosisi, setPekerjaanPosisi] = useState('')
  const [password, setPassword] = useState('')
  const [rePassword, setRePassword] = useState('')

  // OTP State
  const [otpCode, setOtpCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  // UI States
  const [provinces, setProvinces] = useState<Region[]>([])
  const [regencies, setRegencies] = useState<Region[]>([])
  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingRegencies, setLoadingRegencies] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)
  
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  // Realtime password checks
  const pwdChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
    }
  }, [password])

  const isPasswordValid = pwdChecks.minLength && pwdChecks.hasUpper && pwdChecks.hasLower && pwdChecks.hasNumber

  // Fetch provinces on mount
  useEffect(() => {
    async function fetchProvinces() {
      setLoadingProvinces(true)
      try {
        const res = await fetch(`${baseApiUrl}/auth/regions-api`)
        const payload = await res.json()
        if (payload?.success && Array.isArray(payload?.data)) {
          setProvinces(payload.data)
        }
      } catch (err) {
        console.error('Failed to load provinces', err)
      } finally {
        setLoadingProvinces(false)
      }
    }
    fetchProvinces()
  }, [baseApiUrl])

  // Fetch regencies when province changes
  useEffect(() => {
    setKabupatenId('')
    setRegencies([])
    if (!provinsiId) return

    async function fetchRegencies() {
      setLoadingRegencies(true)
      try {
        const res = await fetch(`${baseApiUrl}/auth/regions-api?province_id=${provinsiId}`)
        const payload = await res.json()
        if (payload?.success && Array.isArray(payload?.data)) {
          setRegencies(payload.data)
        }
      } catch (err) {
        console.error('Failed to load regencies', err)
      } finally {
        setLoadingRegencies(false)
      }
    }
    fetchRegencies()
  }, [provinsiId, baseApiUrl])

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    // Frontend Validations
    if (!isPasswordValid) {
      setError('Password belum memenuhi seluruh kriteria keamanan.')
      return
    }

    if (password !== rePassword) {
      setFieldErrors({ re_password: 'Konfirmasi password tidak cocok.' })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${baseApiUrl}/auth/register-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          kategori_akses: kategoriAkses,
          nama_lengkap: namaLengkap,
          username,
          password,
          re_password: rePassword,
          email,
          telp,
          nama_institusi: namaInstitusi,
          pekerjaan_posisi: pekerjaanPosisi,
          alamat_user: alamatUser,
          provinsi_id: parseInt(provinsiId),
          kabupaten_id: parseInt(kabupatenId),
          tujuan_akses: tujuanAkses,
          tujuan_akses_lainnya: tujuanAksesLainnya,
        }),
      })

      const payload = (await response.json().catch(() => null)) as RegisterResponse | null

      if (!response.ok || !payload?.success || !payload.registration_id) {
        if (payload?.errors) {
          setFieldErrors(payload.errors)
        }
        throw new Error(payload?.message || 'Registrasi gagal. Cek kembali form Anda.')
      }

      setRegistrationId(payload.registration_id)
      setStep('otp')
      setResendCooldown(60) // Cooldown 60s
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Verify OTP
  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    
    if (otpCode.length !== 4 || isNaN(Number(otpCode))) {
      setError('Kode OTP harus berupa 4 digit angka.')
      return
    }

    setVerifyingOtp(true)
    try {
      const res = await fetch(`${baseApiUrl}/auth/verify-register-otp-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          registration_id: registrationId,
          otp: otpCode.trim()
        })
      })

      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Verifikasi OTP gagal.')
      }

      setSuccessMessage(payload.message || 'Verifikasi email berhasil!')
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi gagal. Silakan coba lagi.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    setError('')
    setResendingOtp(true)

    try {
      const res = await fetch(`${baseApiUrl}/auth/resend-register-otp-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          registration_id: registrationId
        })
      })

      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Gagal mengirim ulang OTP.')
      }

      setResendCooldown(60)
      alert(payload.message || 'Kode OTP baru telah dikirim ke email Anda.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim ulang OTP.')
    } finally {
      setResendingOtp(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#f0f7f7] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(0,128,128,1) 39px,rgba(0,128,128,1) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(0,128,128,1) 39px,rgba(0,128,128,1) 40px)',
        }}
      />

      <div className="relative z-10 w-full max-w-[800px] bg-white rounded-3xl border border-[#c8dedd] shadow-[0_20px_60px_rgba(15,118,110,0.08)] p-6 sm:p-10">
        
        {/* Back Link (Visible only on Form or Success Step) */}
        {step !== 'otp' && (
          <Link href="/login" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Halaman Masuk
          </Link>
        )}

        {/* Form Step */}
        {step === 'form' && (
          <div>
            {/* Header */}
            <div className="mb-8">
              <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
                Pendaftaran Akun
              </span>
              <h2 className="mt-3 text-[32px] font-extrabold leading-tight tracking-tight text-slate-900">
                Daftar sebagai Masyarakat
              </h2>
              <p className="mt-1 text-slate-500 text-sm">
                Lengkapi data diri Anda untuk pengajuan akun Dashboard Faskes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nama Lengkap */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Nama Lengkap</label>
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                    <UserRound className="h-[18px] w-[18px] text-slate-450" />
                    <input
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      required
                      placeholder="Nama lengkap sesuai KTP"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                    />
                  </div>
                  {fieldErrors.nama_lengkap && <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.nama_lengkap}</p>}
                </div>

                {/* Username */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Username</label>
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                    <UserRound className="h-[18px] w-[18px] text-slate-450" />
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="Username minimal 4 karakter"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                    />
                  </div>
                  {fieldErrors.username && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.username}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Email</label>
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                    <Mail className="h-[18px] w-[18px] text-slate-450" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="contoh@domain.com"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                    />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.email}</p>}
                </div>

                {/* Telp */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">No. Telepon / WA</label>
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                    <Phone className="h-[18px] w-[18px] text-slate-450" />
                    <input
                      value={telp}
                      onChange={(e) => setTelp(e.target.value)}
                      required
                      placeholder="Contoh: 08123456789"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                    />
                  </div>
                  {fieldErrors.telp && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.telp}</p>}
                </div>

                {/* Kategori Akses */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Kategori Akses</label>
                  <select
                    value={kategoriAkses}
                    onChange={(e) => setKategoriAkses(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-500 focus:bg-white"
                  >
                    <option value="masyarakat_umum">Masyarakat Umum</option>
                    <option value="lintas_sektor">Lintas Sektor</option>
                    <option value="ngo_ormas">NGO / Ormas</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                  {fieldErrors.kategori_akses && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.kategori_akses}</p>}
                </div>

                {/* Tujuan Akses */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Tujuan Akses Data</label>
                  <select
                    value={tujuanAkses}
                    onChange={(e) => setTujuanAkses(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-500 focus:bg-white"
                  >
                    <option value="riset_analisa">Riset / Analisa</option>
                    <option value="referensi_media">Sumber Referensi / Media</option>
                    <option value="integrasi_interoperabilitas">Integrasi / Interoperabilitas</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                  {fieldErrors.tujuan_akses && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.tujuan_akses}</p>}
                </div>
              </div>

              {/* Conditional: Tujuan Akses Lainnya */}
              {tujuanAkses === 'lainnya' && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Tulis Tujuan Akses Lainnya</label>
                  <textarea
                    value={tujuanAksesLainnya}
                    onChange={(e) => setTujuanAksesLainnya(e.target.value)}
                    required
                    placeholder="Sebutkan tujuan detail pengaksesan data"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-500 focus:bg-white"
                  />
                  {fieldErrors.tujuan_akses_lainnya && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.tujuan_akses_lainnya}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nama Institusi */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Nama Institusi (Opsional)</label>
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                    <Building2 className="h-[18px] w-[18px] text-slate-450" />
                    <input
                      value={namaInstitusi}
                      onChange={(e) => setNamaInstitusi(e.target.value)}
                      placeholder="Nama Universitas / Instansi"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                    />
                  </div>
                  {fieldErrors.nama_institusi && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.nama_institusi}</p>}
                </div>

                {/* Pekerjaan / Posisi */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Pekerjaan / Jabatan (Opsional)</label>
                  <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                    <Briefcase className="h-[18px] w-[18px] text-slate-450" />
                    <input
                      value={pekerjaanPosisi}
                      onChange={(e) => setPekerjaanPosisi(e.target.value)}
                      placeholder="Dosen / Mahasiswa / Staff"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                    />
                  </div>
                  {fieldErrors.pekerjaan_posisi && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.pekerjaan_posisi}</p>}
                </div>

                {/* Provinsi */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Provinsi {loadingProvinces && <span className="text-teal-600 animate-pulse">(Memuat...)</span>}
                  </label>
                  <select
                    value={provinsiId}
                    onChange={(e) => setProvinsiId(e.target.value)}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-500 focus:bg-white"
                  >
                    <option value="">Pilih Provinsi</option>
                    {provinces.map((prov) => (
                      <option key={prov.id} value={prov.id}>
                        {prov.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.provinsi_id && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.provinsi_id}</p>}
                </div>

                {/* Kabupaten / Kota */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">
                    Kabupaten / Kota {loadingRegencies && <span className="text-teal-600 animate-pulse">(Memuat...)</span>}
                  </label>
                  <select
                    value={kabupatenId}
                    onChange={(e) => setKabupatenId(e.target.value)}
                    required
                    disabled={!provinsiId}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-all focus:border-teal-500 focus:bg-white disabled:opacity-50"
                  >
                    <option value="">{provinsiId ? 'Pilih Kabupaten / Kota' : 'Pilih Provinsi dahulu'}</option>
                    {regencies.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.kabupaten_id && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.kabupaten_id}</p>}
              </div>
            </div>

            {/* Alamat User */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Rumah Lengkap</label>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                <MapPin className="h-[18px] w-[18px] text-slate-450 mt-1" />
                <textarea
                  value={alamatUser}
                  onChange={(e) => setAlamatUser(e.target.value)}
                  required
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                  rows={3}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none resize-none"
                />
              </div>
              {fieldErrors.alamat_user && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.alamat_user}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Password */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Password</label>
                <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                  <LockKeyhole className="h-[18px] w-[18px] text-slate-450" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Minimal 8 karakter"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                  />
                </div>
                {/* Realtime Checklist */}
                {password.length > 0 && (
                  <div className="mt-2.5 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kriteria Keamanan Sandi:</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        {pwdChecks.minLength ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}
                        <span className={pwdChecks.minLength ? 'text-teal-700 font-medium' : 'text-slate-500'}>Min. 8 karakter</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwdChecks.hasUpper ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}
                        <span className={pwdChecks.hasUpper ? 'text-teal-700 font-medium' : 'text-slate-500'}>Huruf Besar (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwdChecks.hasLower ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}
                        <span className={pwdChecks.hasLower ? 'text-teal-700 font-medium' : 'text-slate-500'}>Huruf Kecil (a-z)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {pwdChecks.hasNumber ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}
                        <span className={pwdChecks.hasNumber ? 'text-teal-700 font-medium' : 'text-slate-500'}>Angka (0-9)</span>
                      </div>
                    </div>
                  </div>
                )}
                {fieldErrors.password && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Konfirmasi Password</label>
                <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-teal-500 focus-within:bg-white">
                  <LockKeyhole className="h-[18px] w-[18px] text-slate-450" />
                  <input
                    type="password"
                    value={rePassword}
                    onChange={(e) => setRePassword(e.target.value)}
                    required
                    placeholder="Ulangi password"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
                  />
                </div>
                {/* Password Match Check */}
                {rePassword.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs">
                    {password === rePassword ? (
                      <span className="flex items-center gap-1.5 text-teal-700 font-medium">
                        <Check className="h-3.5 w-3.5 text-teal-600" /> Password cocok
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-600 font-medium">
                        <X className="h-3.5 w-3.5 text-red-500" /> Password tidak cocok
                      </span>
                    )}
                  </div>
                )}
                {fieldErrors.re_password && <p className="mt-1 text-xs text-red-650 font-medium">{fieldErrors.re_password}</p>}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !isPasswordValid || password !== rePassword}
              className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-extrabold uppercase tracking-wider text-white shadow-md hover:bg-teal-800 transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
              {submitting ? 'Mengajukan Pendaftaran...' : 'Kirim Pendaftaran'}
            </button>
          </form>
        </div>
      )}

      {/* OTP Step */}
      {step === 'otp' && (
        <div className="w-full max-w-[450px] mx-auto">
          {/* Header */}
          <div className="mb-7">
            <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">
              Verifikasi Email
            </span>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-slate-900">
              Masukkan Kode OTP
            </h2>
            <p className="mt-1 text-slate-500 text-sm">
              Kode OTP 4-digit telah dikirim ke email <span className="font-semibold text-slate-800">{email}</span>.
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] font-medium text-red-700">
                <AlertCircle className="mt-px h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Kode OTP (4 Digit)</label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 transition-all focus-within:border-teal-500 focus-within:bg-white">
                <KeyRound className="h-[18px] w-[18px] text-slate-450" />
                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  placeholder="Masukkan 4 digit OTP"
                  maxLength={4}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm tracking-widest text-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingOtp}
              className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-teal-800 transition-all shadow-md disabled:opacity-75 disabled:cursor-wait"
            >
              {verifyingOtp ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              {verifyingOtp ? 'Memverifikasi...' : 'Verifikasi OTP'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || resendingOtp}
              className="w-full text-center text-xs font-semibold text-teal-600 hover:text-teal-700 mt-2 disabled:opacity-55 disabled:cursor-not-allowed hover:underline"
            >
              {resendCooldown > 0 ? `Kirim Ulang OTP dalam ${resendCooldown}s` : 'Kirim Ulang OTP'}
            </button>
          </form>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="w-full max-w-[500px] mx-auto text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-teal-600 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-900">Email Terverifikasi</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {successMessage} Akun Anda saat ini berstatus pending dan sedang menunggu persetujuan (approval) oleh Admin Pusat.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-teal-700 px-8 text-xs font-bold uppercase tracking-wider text-white hover:bg-teal-800 transition-colors shadow-md"
            >
              Kembali ke Login
            </Link>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
