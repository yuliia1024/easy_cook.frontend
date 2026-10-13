# Easy Cook web app - conventions

Vite + React 19 + TS, talks to `../easy_cook.backend` (NestJS) through `/api` (Vite proxy in dev).
Read README.md for the layout.

## Rules

- Types in `src/api/types.ts` mirror the backend response DTOs; change both together.
- Server state only through TanStack Query hooks in `features/<name>/<name>.queries.ts`; mutations
  invalidate what they change (foods also invalidate recipes, which embed food values).
- Forms: react-hook-form + zod schema in `*.schema(s).ts`. Inputs are strings; schemas parse them
  and mirror the backend limits. An empty nutrient is `null` (unknown), never 0.
- Every page handles loading, empty and error states; use `Spinner`, `EmptyState`, `ErrorAlert`.
- User-facing text is English (no i18n for now); enum labels live in `src/lib/labels.ts`.
- Every new or changed piece ships with a `*.test.ts(x)` next to it; mock HTTP with MSW
  (`src/test/server.ts`), build data with `src/test/fixtures.ts`.
- Before calling a task done: `npm run lint`, `npm run type-check`, `npm test`, `npm run build`.
- Local ports: web 5173, API 3100.
