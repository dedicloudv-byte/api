# API Relay Worker (Cloudflare Workers)

Web admin modern untuk membuat **API user** yang mem-proxy request ke **API tujuan**, lengkap dengan otorisasi token dan logging error.

## Fitur utama

- Admin membuat route API user ke target API.
- Token random user API disimpan di **R2**.
- Metadata route disimpan di **R2**.
- Log error API disimpan di **R2**.
- Proxy request dari user API ke target API (method dapat dibatasi).
- Dashboard web modern (`/`) untuk kelola route + lihat log.

## Struktur endpoint

- `GET /` → dashboard admin.
- `POST /api/admin/routes` → buat route baru (butuh `x-admin-token`).
- `GET /api/admin/routes` → list route.
- `DELETE /api/admin/routes/:id` → hapus route + token di R2.
- `GET /api/admin/logs?limit=100` → lihat log error.
- `ANY /u/:id` → endpoint user untuk relay ke target API.

## Konfigurasi

1. Buat bucket R2 (contoh nama: `api-relay-storage`).
2. Isi `wrangler.toml` binding `STORAGE_R2` sesuai bucket Anda.
3. Ubah `ADMIN_TOKEN` menjadi token kuat.

## Jalankan lokal

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Header keamanan

- Admin API wajib header: `x-admin-token: <ADMIN_TOKEN>`.
- User API wajib header: `x-user-token: <TOKEN_ROUTE_USER>`.
