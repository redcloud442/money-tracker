# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Money Tracker — a multi-tenant financial tracking app built with Next.js 16 (App Router), React 19, Mantine 8, Prisma 7, Better-Auth, and PostgreSQL.

## Commands

```bash
npm run dev          # Start dev server (next dev)
npm run build        # Production build
npm run lint         # Biome linter (biome check)
npm run format       # Biome formatter (biome format --write)
npm run db:push      # Push Prisma schema to database
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Generate Prisma client
npm run bt:generate  # Generate Better-Auth types
```

## Architecture

### Routing & Multi-tenancy

The app uses Next.js App Router with a dynamic `[orgId]` segment for all authenticated routes. Public routes (`/login`, `/register`, `/onboarding`) live at the top level. After login, users are redirected to `/{orgId}` where orgId is their active organization.

### Authentication

Better-Auth handles auth with email/password and OAuth (Google, GitHub). Config lives in `lib/better-auth/auth.ts` (server) and `lib/better-auth/auth-client.ts` (client). The catch-all route at `app/api/auth/[...all]/route.ts` handles all auth endpoints. Session checking and org access validation happens in the `[orgId]/layout.tsx`.

### Database

Prisma ORM with PostgreSQL. Schema at `prisma/schema.prisma`. The Prisma client is generated to `app/generated/prisma/` (gitignored). A singleton pattern in `lib/prisma/prisma.ts` prevents multiple client instances in dev. Config uses `@prisma/adapter-pg` for the PostgreSQL adapter.

Key models: User, Organization, Member (multi-tenant membership), Wallet (7 types), Transaction, Category (INCOME/EXPENSE), Budget (with period tracking).

### API Routes

REST endpoints in `app/api/`:
- `transactions/route.ts` — GET (list by userId, limit 50) and POST (creates transaction + updates wallet balance)
- `wallets/route.ts` — GET (with transaction count) and POST
- `categories/route.ts` — GET (filterable by type) and POST

All API routes use the Prisma singleton from `lib/prisma/prisma.ts`.

### UI & Components

Mantine 8 is the component library, configured in `app/layout.tsx` with MantineProvider. Components are organized by page in `components/` (e.g., `DashboardLayout/`, `LoginPage/`). Forms use Mantine Form with Zod validation. Icons are from `@tabler/icons-react`.

### Styling

PostCSS with Mantine preset. Custom breakpoints defined in `postcss.config.cjs`. No Tailwind — use Mantine's styling system.

## Key Conventions

- Path alias: `@/*` maps to the project root
- Formatting: Prettier config (double quotes, semicolons, 2-space tabs, trailing comma ES5)
- Linting: Biome for code quality checks
- Environment variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (defined in `.env`)
