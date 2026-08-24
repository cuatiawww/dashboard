# Dashboard Puskes

Project ini adalah dashboard berbasis Next.js untuk kebutuhan pemantauan data kesehatan. Repository ini merupakan lanjutan dan penyesuaian dari project lama yang sedang diarahkan ulang menjadi `dashboard-puskes`.

## Menjalankan Project

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Env Wajib

Buat file `.env.local` berdasarkan `.env.example`.

```env
SIPKK_BACKEND_BASE_URL=https://sipkk-new.mediaciptainformasi.co.id
NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL=https://sipkk-new.mediaciptainformasi.co.id
```

`NEXT_PUBLIC_SIPKK_BACKEND_BASE_URL` dipakai oleh browser supaya request frontend langsung mengarah ke backend `sipkk-new`, seperti:

- `https://sipkk-new.mediaciptainformasi.co.id/api/captcha`
- `https://sipkk-new.mediaciptainformasi.co.id/api/login`
- `https://sipkk-new.mediaciptainformasi.co.id/api/register`

Jika deploy ke Vercel, pastikan `SIPKK_BACKEND_BASE_URL` juga diisi di project settings lalu lakukan redeploy.

## Catatan CAPTCHA

Halaman login utama saat ini mengambil captcha dan login langsung ke backend Yii, bukan melalui API route Vercel.

Endpoint yang dipakai halaman login:

- `GET https://sipkk-new.mediaciptainformasi.co.id/api/captcha`
- `POST https://sipkk-new.mediaciptainformasi.co.id/api/login`

Masih ada route lokal `/api/captcha`, `/api/captcha/validate`, dan `/api/login` untuk kebutuhan demo/eksperimen lama.

## Dependency CAPTCHA Demo Lokal

Install dependency berikut jika route demo lokal masih ingin dipakai:

```bash
npm install svg-captcha uuid @upstash/redis
```

## Struktur Folder CAPTCHA Demo Lokal

```text
src/
  app/
    api/
      captcha/
        route.ts
        validate/
          route.ts
      login/
        route.ts
    login/
      page.tsx
  components/
    auth/
      CaptchaWidget.tsx
  lib/
    captcha/
      config.ts
      memory-store.ts
      service.ts
      store.ts
      types.ts
      upstash-store.ts
```

## Cara Kerja Route Demo Lokal

- `GET /api/captcha` membuat CAPTCHA SVG baru dan mengembalikan `{ id, svg }`.
- `POST /api/captcha/validate` menerima `{ id, text }`, mencocokkan secara case-insensitive, lalu menghapus challenge setelah divalidasi.
- CAPTCHA berlaku selama 2 menit.
- `CaptchaWidget` adalah Client Component yang:
  - menampilkan SVG
  - refresh CAPTCHA
  - input text
  - verify via `fetch`
- Halaman login contoh memaksa CAPTCHA tervalidasi lebih dulu sebelum `POST /api/login` diproses.

## Env Demo Lokal

### Development

```env
CAPTCHA_STORE=memory
DEMO_LOGIN_USERNAME=admin
DEMO_LOGIN_PASSWORD=demo12345
```

### Production dengan Redis / Upstash

```env
CAPTCHA_STORE=upstash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
DEMO_LOGIN_USERNAME=admin
DEMO_LOGIN_PASSWORD=demo12345
```

## Best Practice Security

- TTL dibatasi 2 menit agar challenge cepat kedaluwarsa.
- Jawaban CAPTCHA dinormalisasi ke lowercase sehingga validasi case-insensitive.
- Challenge dihapus setelah divalidasi, termasuk saat gagal, supaya tidak bisa di-bruteforce berkali-kali.
- Route validasi mengatur cookie `httpOnly` sementara agar server login bisa memastikan CAPTCHA memang sudah lolos.
- Untuk production, gunakan Redis/Upstash agar state CAPTCHA tidak bergantung pada memory proses Next.js.

## Catatan Migrasi

- Nama package sudah diarahkan ke `dashboard-puskes`.
- Beberapa modul internal masih memakai penamaan lama `psc` karena masih terhubung ke struktur halaman dan endpoint existing.
- Branding dan konfigurasi dasar bisa dirapikan bertahap tanpa harus langsung mengubah seluruh route/API.

## Collector Data NTT

Repository sibling `../collector/` menjalankan service `ntt-collector` yang mengambil
empat tabel publik dari `https://ntt.tanggap-bencana.go.id/` setiap 30 menit. Bagian
Tim Pendukung Kesehatan tidak diproses.

Source collector juga tersedia di:
`https://gitea.mediaciptainformasi.go.id/KEMKES/collector-ntt`

Alur penyimpanan datanya:

```text
collector container /data
        │ bind mount
        ▼
host ${NTT_DATA_DIR}
        │ read-only mount
        ▼
dashboard/API container ${NTT_DATA_DIR}
```

Folder host collector ditentukan oleh `NTT_DATA_DIR` pada `../collector/.env.collector`.
Dashboard juga membutuhkan nilai `NTT_DATA_DIR` di env utama untuk mount read-only
ke API; keduanya harus menunjuk ke folder host yang sama:

```bash
NTT_DATA_DIR=/home/pusatkrisis/docker/data-ntt
```

Collector selalu menggunakan `/data` di dalam containernya. API Next.js membaca
folder host tersebut melalui path `NTT_DATA_DIR` yang sama di dalam container.

Jika salah satu tabel pada halaman sumber kosong, collector tidak menimpa CSV
sebelumnya. CSV lama dipertahankan sebagai backup; jika belum ada CSV sebelumnya,
file untuk tabel tersebut tidak dibuat.

Contoh isi folder:

```text
2026-08-20_analisa_ringkasan_harian.csv
2026-08-20_situasi_kesehatan.csv
2026-08-20_pasien_rs.csv
2026-08-20_pasien_puskesmas.csv
manifest.json
```

API lokal Next.js membaca file tersebut:

```text
GET /dashboard-eoc/api/ntt-data
GET /dashboard-eoc/api/ntt-data?tanggal=2026-08-20
GET /dashboard-eoc/api/ntt-data?tanggal=2026-08-20&tabel=pasien_rs
```

API memprioritaskan data PostgreSQL `collector_bencana_ntt` dari tabel
`ntt_records`. Jika database belum tersedia atau belum berisi data, API otomatis
fallback ke CSV lokal. Isi `POSTGRES_PASSWORD` pada `.env` dashboard dengan
kredensial PostgreSQL yang sama dengan collector.

Saat development, jalankan Next.js dengan `yarn dev` dan gunakan base path yang sama.
Dashboard dan collector dijalankan sebagai dua repository sibling:

```bash
# dari folder dashboard
docker compose up -d --build

# collector berada satu level di atas repository dashboard
cd ../collector
cp .env.collector.example .env.collector
# isi POSTGRES_PASSWORD, lalu:
docker compose --env-file .env.collector up -d --build
```

Untuk melihat log collector:

```bash
cd ../collector
docker compose --env-file .env.collector logs -f ntt-collector
```

Salin `../collector/.env.collector.example` menjadi `../collector/.env.collector`, lalu isi
`POSTGRES_PASSWORD` sesuai password user PostgreSQL. File tersebut tidak di-commit.
