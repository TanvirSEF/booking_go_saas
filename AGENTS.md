<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BookingGo SaaS — Codebase Guidelines & Agent Conventions

All AI agents working on this codebase MUST strictly follow these rules and architectural conventions:

---

## 1. Project Architecture & Tech Stack Overview
- **Framework**: Next.js 16 (App Router, Turbopack, React 19).
- **Database & ODM**: MongoDB with Mongoose (`lib/db.ts`).
- **Authentication & RBAC**: NextAuth.js v5 (`auth.ts`, `auth.config.ts`, `proxy.ts`).
  - Roles: `super admin`, `company`, `staff`, `customer`.
- **Styling & UI**: Tailwind CSS v4, `@tabler/icons-react`, `shadcn/ui` (Radix primitives).
- **Architecture**: Multi-Tenant Appointment & Scheduling Engine with SaaS Subscription Management.

---

## 2. Multi-Tenant Scoping & Data Isolation (Critical)
- **Strict Data Isolation**: Every business entity (`Location`, `Category`, `Service`, `Staff`, `Appointment`, `CustomField`, `CustomStatus`, `Order`, `BusinessHour`, `Holiday`) MUST be scoped by `companyId` and `businessId`.
- **No Cross-Tenant Leaks**: All database queries and mutations in Server Actions or Route Handlers must explicitly verify that the requesting session owns or has access to the specified `companyId` and `businessId`.
- **Plan Limits Enforcement**: Before creating billable resources (staff, services, locations, businesses), always enforce subscription plan limits via `lib/plan-limits.ts`.
- **Atomic Booking Concurrency**: Use collision checks in `lib/booking-engine.ts` and `actions/appointment.ts` to prevent double-booking slots exceeding `maximumSlot` capacity.

---

## 3. Server-First Architecture (SSR / RSC & Server Actions)
- Every page (`app/**/page.tsx`) and layout (`layout.tsx`) MUST be a **React Server Component (RSC)** by default.
- **Never** add `"use client"` at the page or layout level.
- Push client boundaries strictly to leaf interactive components (e.g., booking wizard steps, calendar controls, interactive modals, form inputs).
- Handle data mutations and form submissions via Server Actions in `actions/` with Zod schema validation.
- Route Handlers (`app/api/...`) are reserved for external webhooks (e.g. Stripe, PayPal) and public API endpoints.

---

## 4. Modular & Standardized Directory Structure
Place components, models, and actions strictly in their dedicated domain folders:
- `app/(auth)/` — Authentication pages (login, register, forgot-password).
- `app/(dashboard)/` — Company tenant portal & staff management pages.
- `app/(admin)/admin/` — Super Admin platform dashboard & SaaS plan management.
- `app/appointments/[slug]/` — Public responsive multi-step booking wizard.
- `app/find-appointment/[slug]/` — Public appointment search, status tracking & rescheduling.
- `components/booking/` — Booking wizard steps, time slot selectors, and checkout widgets.
- `components/dashboard/` — Tenant dashboard UI (KPI cards, appointment tables, schedule calendar, settings).
- `components/admin/` — Super Admin UI (tenant list, subscription plans, system settings).
- `components/ui/` — Base reusable primitives (shadcn / Radix).
- `components/shared/` — Cross-domain shared UI elements (header, footer, theme toggles, modal dialogs).
- `models/` — Mongoose schemas with TypeScript interfaces and compound indexes.
- `actions/` — Domain Server Actions (`appointment.ts`, `tenant.ts`, `staff.ts`, `billing.ts`, etc.).
- `lib/` — Core libraries (`db.ts`, `booking-engine.ts`, `plan-limits.ts`, `password.ts`, `utils.ts`).

---

## 5. Icons & Asset Conventions
- **NEVER hardcode or inline raw `<svg>` elements** inside components.
- Always import icons exclusively from `@tabler/icons-react` (e.g. `import { IconCalendar, IconClock, IconUser, IconCheck } from '@tabler/icons-react'`).
- Do not install extra icon libraries or write ad-hoc SVG paths.

---

## 6. Human-Style Clean Code (Zero AI Clutter)
- **Do NOT add obvious, redundant comments** (e.g. `// fetch appointments`, `// return JSX`, `// handle click`).
- Write clean, self-documenting code with descriptive naming.
- Keep implementations direct, simple, and maintainable. Avoid premature abstractions, unnecessary wrappers, or generic factory functions for 2-3 line logic.

---

## 7. Strict Typing & Pre-Push Quality
- Maintain complete TypeScript typing without using `any`.
- Always ensure both `pnpm typecheck` (`tsc --noEmit`) and `pnpm lint` pass with zero errors before considering any task complete.
- Use configured root path aliases (`@/components/...`, `@/models/...`, `@/actions/...`, `@/lib/...`, `@/types/...`) instead of deep relative imports (`../../../../`).
- **Idiomatic Error & Loading States**: Use Next.js conventions (`error.tsx`, `not-found.tsx`, `loading.tsx`) and standard Skeleton loaders.