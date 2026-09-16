<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository Codebase Guidelines & Conventions

All AI agents working on this codebase MUST strictly follow these rules:

## 1. Server-First Architecture (SSR / RSC)
- Every page (`app/**/page.tsx`) and layout (`layout.tsx`) MUST be a **React Server Component (RSC)** by default.
- Never add `"use client"` at the page or layout level.
- Push client boundaries strictly to leaf interactive components (e.g. forms, interactive buttons, dynamic state widgets).
- Fetch data on the server using async/await and parallel `Promise.all` where applicable.

## 2. Modular & Reusable Component Architecture
- Break UI into small, focused, reusable components. Never dump monolithic code into page files.
- Place components in their respective domain folders:
  - `components/site/` — Public website components (headers, footers, article sections, cards, etc.).
  - `components/dashboard/` — Admin dashboard components (tables, metrics, layouts, sidebars).
  - `components/blocks/` — TipTap rich text & article content block renderers.
  - `components/ui/` — Base reusable primitives (shadcn / Radix).
  - `components/shared/` — Cross-domain shared UI elements.

## 3. Human-Style Clean Code (Zero AI Clutter)
- **Do NOT add obvious, redundant comments** (e.g. `// fetch posts`, `// return JSX`, `// handle click`).
- Write clean, self-documenting code with clear variable and function names.
- Keep implementations direct, simple, and concise. Avoid over-engineering or adding unnecessary abstractions.

## 4. Core Web Vitals & Performance
- Maintain optimal TTFB, LCP, and CLS.
- Use Next.js ISR (`revalidate = 300` or appropriate intervals) for public pages.
- Server-render SEO metadata (`generateMetadata`) and structured JSON-LD schemas.
- Do not import heavy, unneeded third-party libraries; utilize existing utilities and Tailwind CSS v4.

## 5. Strict Typing & Pre-Push Quality
- Maintain complete TypeScript typing without using `any`.
- Always ensure both `pnpm typecheck` and `pnpm lint` pass with zero errors.

## 6. Icons & Asset Conventions
- **NEVER hardcode or inline raw `<svg>` elements** inside components.
- Always import icons exclusively from the project's installed packages: `lucide-react` or `@tabler/icons-react`.
- Do not install new icon packages or write ad-hoc SVG paths.

## 7. Anti-Patterns & Engineering Discipline (Avoid AI Code Smells)
- **No Premature Abstractions**: Do not create unnecessary wrappers, helper factories, or generic interfaces for simple 2-3 line logic. Write direct and idiomatic React / TypeScript.
- **No Hook Clutter**: Avoid overusing `useEffect`, `useCallback`, or `useMemo` for trivial calculations. Derive state naturally or leverage TanStack Query and React 19 primitives.
- **Clean Path Aliases**: Always use configured root path aliases (e.g. `@/components/...`, `@/lib/...`, `@/types/...`) instead of deep relative imports (`../../../../`).
- **No Fake / Mock Placeholders**: Never leave `TODO: implement later` stubs or hardcoded dummy mocks in production code. Wire directly to active API wrappers and schema types.
- **Idiomatic Error & Loading States**: Use Next.js conventions (`error.tsx`, `not-found.tsx`) and standard Skeleton loaders rather than custom ad-hoc error dialogs.

## 8. Developer Git Workflow & Strict Branch Rules
- **Designated Branch**: Always work on local branch **`sohel`**.
- **Pull Protocol**: Pull / sync latest codebase updates from **`origin/main`** (`git fetch origin main`, `git merge origin/main`).
- **Push Restriction**: **NEVER push to GitHub without explicit user permission**.
- **Target Push Branch**: When explicitly told to push, push **STRICTLY to `origin sohel`** (`git push origin sohel`). NEVER push to `main`, `dev`, `master`, or other developer branches.
- **Pre-Push Quality Gate**: Ensure `pnpm typecheck` (0 errors) and `pnpm lint` (0 errors, 0 warnings) pass cleanly before committing/pushing.