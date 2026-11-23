# Easy Cook web app

UI for the Easy Cook backend (`../easy_cook.backend`): food catalog, recipe catalog with calories and macros per
recipe and per serving, profile and daily nutrition goals, dietary preferences, versioned menus and a chat with
the assistant (a deterministic stub until the LLM stage). Google sign-in; the API allows listed emails only.

Vite 8 · React 19 · TypeScript 6 · React Router 7 · TanStack Query 5 · react-hook-form + zod 4 ·
Tailwind CSS 4 · Vitest + Testing Library + MSW. UI language: English.

## Run

```bash
nvm use                 # Node 24
cp .env.example .env    # optional, the defaults work
npm install
npm run dev             # http://localhost:5173
npm run build && npm run preview   # the build, with the production security headers: http://localhost:4173
```

The backend must be running on port 3100 (`npm run start:dev` there, see its README for the
database and seed). The dev server proxies `/api` to `API_PROXY_TARGET`
(default `http://localhost:3100`), so no CORS setup is needed. For a build served elsewhere set
`VITE_API_URL` to the full API URL (e.g. `http://localhost:3100/api`) before `npm run build`.

The backend accepts requests with the session cookie only from the origins in its `CORS_ORIGINS`
(`http://localhost:5173,http://localhost:4173` locally); production lists the web app URL there.

### Sign-in

Set `VITE_GOOGLE_CLIENT_ID` to a Google OAuth client ID (Web application) with
`http://localhost:5173` (and `http://localhost:4173` for the preview) among its authorized JavaScript origins; the backend checks ID tokens
against the same client. The login page (`/login`) fetches a single-use nonce
(`GET /auth/nonce`, renewed after a failed attempt and every 9 minutes), shows the Google button
(Google Identity Services) and posts the ID token to `POST /auth/google`.

The session is an httpOnly cookie: the page keeps only the user and the CSRF token, in memory,
and stores nothing. On start-up `GET /auth/session` tells whether the cookie is still valid.
Every request goes with `credentials: 'include'`; every unsafe one (the chat stream too) with
`X-CSRF-Token`, re-fetched once when the API rejects it. Any 401 ends the session: the query
cache is dropped and the login page opens, bringing the user back to the page afterwards.
That page (`?next=`) must be a path of this origin, parsed as the browser does (tabs and line
breaks dropped, `\` read as `/`); anything else opens `/`. Signing out ends the session on the
backend first: when that fails (other than a 401) the user stays signed in and sees the error, since
the httpOnly cookie would bring the session back on the next page load.

### Security headers

`config/security-headers.ts` holds the headers of the app's pages: a CSP allowing only the app,
the Google button (`accounts.google.com/gsi/`), the Inter font, Google avatars and the API origin of
`VITE_API_URL`; no inline or eval scripts (inline styles are allowed: the Google script adds
them); `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy:
same-origin-allow-popups` (the Google popup) and a `Permissions-Policy`. `npm run preview` serves
the build with all of them; `npm run dev` without the CSP (Vite's React Refresh script is inline).

The production host (nginx, CDN) must send the same headers, `pageHeaders()` of that file, plus
`Strict-Transport-Security: max-age=63072000; includeSubDomains` over HTTPS. After changing what the
app loads (a new script, font or API host), update the policy and check `npm run preview` for CSP
errors in the browser console.

## Pages

| Path | |
|---|---|
| `/login` | Google sign-in; every other page needs a session |
| `/chat`, `/chat/:id` | home (`/` opens it); conversations with the assistant; a menu linked to a conversation or reply opens from it; a reply with a menu confirms its version (another version of the same menu is replaced; a version that breaks the current preferences shows why); a proposed preference change is confirmed from its reply |
| `/foods` | search by name, filter by state and source, calories and macros per 100 g |
| `/foods/:id`, `/foods/new`, `/foods/:id/edit` | details and form; an empty value is *unknown* (`null`), not 0 |
| `/recipes` | search, meal type, diet tags (all must match), calories and macros per serving |
| `/recipes/:id` | allergens (as recorded; an empty list is not "none"), calories and macros per serving, for the whole recipe and per ingredient; optional ingredients on demand |
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
config/         security headers of the pages (dev, preview, production)
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
