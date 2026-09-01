# Laradger Web — Frontend

React SPA untuk Laradger. Draft v1 — iterasi bareng setelah ini.

## Stack

- **React** 19 + **React DOM** 19
- **TanStack Router** ^1.170 (file-based routing) + Router Plugin Vite
- **Vite** ^8 + **@vitejs/plugin-react**
- **Tailwind CSS** v4 + **@tailwindcss/vite** + `tw-animate-css`
- **shadcn/radix** (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`)
- **lucide-react** (icons), **zod** (validation)
- **TypeScript** 7 (native preview)

## Quick Start

```sh
npm install        # atau pnpm install
npm run dev        # http://localhost:3000
```

## Scripts

| Command | Fungsi |
|---------|--------|
| `npm run dev` | Vite dev server di `:3000` |
| `npm run build` | `vite build && tsc --noEmit` (cek type) |
| `npm run preview` / `npm start` | preview build |
| `tsc --noEmit` | validasi type manual |

## Routing

File-based di `src/routes/` — **jangan edit manual** `src/routeTree.gen.ts` (auto-generated).

```
src/
├── routes/            # tambah file = tambah route
├── components/        # UI primitives (shadcn/radix)
├── lib/               # utils (cn, etc)
├── styles.css
├── main.tsx
└── routeTree.gen.ts   # generated
```

Alias path: `@/*` → `./src/*` (lihat `vite.config.js` & `tsconfig.json`).

Contoh tambah route:

```sh
# src/routes/dashboard.tsx
export const Route = createFileRoute('/dashboard')({ component: Dashboard })
```

## Styling

- Tailwind v4 via Vite plugin — tidak perlu `tailwind.config.js` terpisah
- `components.json` untuk shadcn
- `shadcn add button` untuk nambah komponen

## Env

Lihat `.env.example` (saat ini 109 byte). Duplikat ke `.env` untuk lokal:

```sh
cp .env.example .env
```

## Konvensi

- Route tree jangan di-hand-edit
- Validasi type sebelum push: `npm run build`
- Ikuti konvensi file di `src/` yang sudah ada
- Jangan tambah dependency tanpa approval

## Roadmap

- [ ] Deskripsi fitur frontend Laradger
- [ ] Screenshot / demo GIF
- [ ] Integrasi API backend (Sanctum)
- [ ] Panduan kontribusi

## Lisensi

MIT
