# Dashboard Puskes

Project ini adalah dashboard berbasis Next.js untuk kebutuhan pemantauan data kesehatan. Repository ini merupakan lanjutan dan penyesuaian dari project lama yang sedang diarahkan ulang menjadi `dashboard-puskes`.

## Menjalankan Project

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:3000`.

## Dependency CAPTCHA

Install dependency berikut jika belum ada:

```bash
npm install svg-captcha uuid @upstash/redis
npm install -D @types/svg-captcha
```

## Struktur Folder CAPTCHA

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

## Cara Kerja

- `GET /api/captcha` membuat CAPTCHA SVG baru dan mengembalikan `{ id, svg }`.
- `POST /api/captcha/validate` menerima `{ id, text }`, mencocokkan secara case-insensitive, lalu menghapus challenge setelah divalidasi.
- CAPTCHA berlaku selama 2 menit.
- `CaptchaWidget` adalah Client Component yang:
  - menampilkan SVG
  - refresh CAPTCHA
  - input text
  - verify via `fetch`
- Halaman login contoh memaksa CAPTCHA tervalidasi lebih dulu sebelum `POST /api/login` diproses.

## Env Local dan Production

Buat file `.env.local` berdasarkan `.env.example`.

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
