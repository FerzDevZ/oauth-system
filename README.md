# oauth-system

Login OAuth 2.0 manual untuk Google dan GitHub. Tanpa Supabase, tanpa library auth — semua flow ditulis sendiri dengan Next.js (App Router).

## Fitur

- Login via Google dan GitHub
- PKCE (S256) untuk Google
- Proteksi route lewat `proxy.ts`
- Rate limiting di endpoint auth
- Session tersimpan di SQLite (`better-sqlite3`)
- Logout, logout semua perangkat
- Log aktivitas auth ke `data/auth.log`

## Setup

1. Install dependensi

   ```bash
   npm install
   ```

2. Buat OAuth credentials:

   - **Google**: buat OAuth Client ID di [Google Cloud Console](https://console.cloud.google.com/apis/credentials), tambahkan redirect URI `http://localhost:3000/auth/google/callback`
   - **GitHub**: buat OAuth App di [GitHub Developer Settings](https://github.com/settings/developers), isi callback URL `http://localhost:3000/auth/github/callback`

3. Salin `.env.example` ke `.env`, lalu isi credential-nya

4. Jalankan

   ```bash
   npm run dev
   ```

   Buka `http://localhost:3000`.

## Scripts

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Build production |
| `npm run lint` | Lint |
| `npm test` | Unit test (vitest) |
| `npm run test:e2e` | E2E test (playwright) |

## Struktur

```
src/
  proxy.ts              # proteksi route global
  app/auth/             # start & callback OAuth, logout
  app/dashboard/        # halaman protected
  lib/
    db.ts               # SQLite (users, sessions)
    session.ts          # buat/validasi/hapus session
    security.ts         # rate limiting
    logger.ts           # log event auth
    oauth/              # google.ts, github.ts, pkce.ts
data/
  auth.db               # database (auto dibuat, di-gitignore)
  auth.log              # log aktivitas
```

## Catatan

- `.env` dan `data/` di-gitignore, jangan commit credential ke repo
- Database dibuat otomatis saat pertama kali dijalankan
