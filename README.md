# Easy Cook web app

UI for the Easy Cook backend (`../easy_cook.backend`): food catalog, recipe catalog with calories and macros per
recipe and per serving, profile and daily nutrition goals, dietary preferences, versioned menus and a chat with
the assistant (a deterministic stub until the LLM stage). Single user, no auth.

Vite 8 · React 19 · TypeScript 6 · React Router 7 · TanStack Query 5 · react-hook-form + zod 4 ·
Tailwind CSS 4 · Vitest + Testing Library + MSW. UI language: English.

## Run

```bash
nvm use                 # Node 24
cp .env.example .env    # optional, the defaults work
npm install
npm run dev             # http://localhost:5173
```

The backend must be running on port 3100 (`npm run start:dev` there, see its README for the
database and seed). The dev server proxies `/api` to `API_PROXY_TARGET`
(default `http://localhost:3100`), so no CORS setup is needed. For a build served elsewhere set
`VITE_API_URL` to the full API URL (e.g. `http://localhost:3100/api`) before `npm run build`.

## Pages

| Path | |
|---|---|
| `/chat`, `/chat/:id` | home (`/` opens it); conversations with the assistant; a menu linked to a conversation or reply opens from it; a reply with a menu confirms its version (another version of the same menu is replaced; a version that breaks the current preferences shows why) |
| `/foods` | search by name, filter by state and source, calories and macros per 100 g |
| `/foods/:id`, `/foods/new`, `/foods/:id/edit` | details and form; an empty value is *unknown* (`null`), not 0 |
| `/recipes` | search, meal type, diet tags (all must match), calories and macros per serving |
| `/recipes/:id` | calories and macros per serving, for the whole recipe and per ingredient; optional ingredients on demand |
| `/recipes/new`, `/recipes/:id/edit` | form, ingredients picked from the food catalog, live calories and macros preview |
| `/profile` | profile, current goal, rule based preview + save, manual goal, goal history |
| `/preferences` | diets, allergies, excluded and disliked foods; menus follow them |
| `/menus` | side list like the chat's: Confirmed and Drafts always shown, 5 newest each with "Show all", a draft's versions in a dropdown; the active menu (confirmed last) is opened next to it |
| `/menus/:id` | the same list with that menu opened (`?version=N` picks the version): versions (newest first), daily average vs the goal, issues, days with meals and totals; rename, confirm a version, delete |

Nutrition rules worth knowing:

- Food values are per 100 g **in the food's state**: dry and boiled rice are different foods, so
  pick the one that matches what is weighed.
- The recipe form preview (`src/lib/nutrition.ts`) uses the same maths as the backend; the saved
  recipe always shows the server result (`GET /recipes/:id/nutrition`).
- Daily goals are reference values for meal planning, not medical advice; the page says so.
- The web app does not create menus or change their content: it shows the saved ones. A menu keeps its
  versions, and only an explicit "Confirm" makes a version the menu (the backend rejects versions that
  break a dietary rule).

## Structure

```
src/
  api/          fetch client (`ApiError`), endpoint functions, types mirroring the backend DTOs
  app/          routes (lazy per page), query client
  components/   shared UI: Button, Field, MacrosSummary, ErrorAlert, Spinner, Pagination...
  features/     foods/, recipes/, profile/, preferences/, menus/, chat/ - pages, `*.queries.ts` (TanStack Query), form schemas
  lib/          labels (enum -> English), formatting, nutrition estimate, error messages
  test/         MSW server, fixtures, render helpers
```

Every page handles loading, empty and error states (with retry); form errors from the API
(`400` details, `409`) are shown next to the form.

## Checks

```bash
npm run lint
npm run type-check
npm test          # Vitest; API mocked with MSW, unhandled requests fail the test
npm run build
```
