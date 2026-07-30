# WFH Weekly Registration App — Implementation Tracker

> Last updated: 2026-07-31
> Status legend: `[ ]` not started · `[/]` in progress · `[x]` done

---

## Confirmed Decisions

| Topic | Decision |
|---|---|
| Auth | Email + Password (Firebase Auth, already enabled) |
| Self-registration | Any valid email can register |
| Date/Time | English UI, all dates/times in **GMT+7 (Asia/Ho_Chi_Minh)** |
| Cancel/Edit WFH | Allowed **before the WFH day arrives** (server-enforced) |
| Deployment — Frontend | **Firebase Hosting** |
| Deployment — Backend | **Firebase Cloud Functions v2** (`asia-southeast1`) |
| Firebase project | `wfh-weekly-register` |
| Firebase billing | Blaze (pay-as-you-go) ✅ |
| Firebase credentials | Service account: `.agent/wfh-weekly-register-firebase-adminsdk-fbsvc-2fc8f69391.json` |
| Web API Key | `AIzaSyAv5i6KjmcoxB8hJfZwkH7tScNfk0dJwAE` |

---

## Architecture

```
Browser (React / Vite SPA)
    │
    │ /api/v1/** → Cloud Function rewrite (same domain, no CORS in prod)
    ▼
Firebase Hosting ──rewrite /api/**──► Cloud Function "api" (Express v2 onRequest)
                                            │
                                            │ firebase-admin SDK
                                            ▼
                                   Firebase Auth + Firestore
```

- **Frontend**: Zero Firebase SDK. All data via HTTP to the backend.
- **Backend entry (prod)**: `apps/server/src/index.ts` exports Express app wrapped in `onRequest`.
- **Backend entry (dev)**: `apps/server/src/server.ts` runs via `tsx watch` on `localhost:3001`.
- **CORS**: Only needed in local dev (`localhost:3000` ↔ `localhost:3001`). Not needed in production.

---

## Phase 1 — Backend Firebase Foundation & Auth Endpoints

**Goal:** Connect `firebase-admin`, expose register/login/me endpoints.

### `apps/server`

- [ ] **[MODIFY] `package.json`** — add `firebase-admin`, `dotenv`
- [ ] **[NEW] `.env`** — populate with Firebase credentials (gitignored)
  ```
  FIREBASE_PROJECT_ID=wfh-weekly-register
  FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@wfh-weekly-register.iam.gserviceaccount.com
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  FIREBASE_WEB_API_KEY=AIzaSyAv5i6KjmcoxB8hJfZwkH7tScNfk0dJwAE
  PORT=3001
  CORS_ORIGIN=http://localhost:3000
  ```
- [ ] **[NEW] `src/lib/firebase-admin.ts`** — init Admin SDK, export `adminAuth` + `adminDb`
- [ ] **[NEW] `src/middleware/auth.middleware.ts`** — `verifyToken`: Bearer → `verifyIdToken()` → `req.user`
- [ ] **[NEW] `src/routes/auth.routes.ts`** — endpoints:
  - `POST /api/v1/auth/register` — `adminAuth.createUser()` + Firestore `users/{uid}` doc (`displayName: null`)
  - `POST /api/v1/auth/login` — Firebase Auth REST `signInWithPassword` → returns `{ token, refreshToken }`
  - `GET /api/v1/auth/me` *(protected)* — returns Firestore `users/{uid}`
  - `PATCH /api/v1/auth/me` *(protected)* — updates `displayName` in Firebase Auth + Firestore
- [ ] **[MODIFY] `src/server.ts`** — load dotenv, mount `authRouter`, restrict CORS to `CORS_ORIGIN`

**✅ Gate:** Register → user visible in Firebase Console. Login → valid `idToken`. `PATCH /me` → displayName updated in both places.

---

## Phase 2 — Backend Schedule & Dashboard Endpoints

**Goal:** WFH CRUD with FCFS color assignment, weekend lockout, cancel-before-day guard.

### `apps/server`

- [ ] **[NEW] `src/lib/color.util.ts`** — `registrationOrder` (1–5) → `{ name, hex }` (Blue/Yellow/Green/Purple/Orange)
- [ ] **[NEW] `src/lib/date.util.ts`** — GMT+7-aware helpers: `getISOWeek()`, `isWeekend()`, `isPastOrToday()`
- [ ] **[NEW] `src/routes/schedule.routes.ts`** — endpoints:
  - `GET /api/v1/schedules?year=&weekNumber=` *(protected)* — team schedule annotated with colors
  - `POST /api/v1/schedules` *(protected)* — body `{ wfhDate }`: validate date, reject weekend (400), reject duplicate user+week (409), assign `registrationOrder`, save to Firestore
  - `DELETE /api/v1/schedules/:id` *(protected)* — reject if date is today/past (400), verify ownership (403), delete
- [ ] **[NEW] `src/routes/dashboard.routes.ts`** — `GET /api/v1/dashboard/stats` *(protected)*: `{ nextWfhDate, wfhDaysCountThisMonth, wfhDaysCountThisYear }` in GMT+7
- [ ] **[MODIFY] `src/server.ts`** — mount `scheduleRouter`, `dashboardRouter`

**✅ Gate:** Weekend POST → 400. 5 POSTs → `registrationOrder` 1–5. 6th → 409. DELETE past date → 400. GET returns colors correctly.

---

## Phase 3 — Frontend Auth Flow

**Goal:** `/login` + `/register-account` routes, auth state, route guard.

### `apps/web`

- [ ] **[NEW] `.env`** — `VITE_API_BASE_URL=http://localhost:3001`
- [ ] **[NEW] `src/lib/api-client.ts`** — fetch wrapper: base URL from env, Bearer token from localStorage, auto-logout on 401
- [ ] **[NEW] `src/lib/auth.store.ts`** — Jotai `authAtom: { token, user: { uid, email, displayName } } | null`, persisted to localStorage
- [ ] **[NEW] `src/routes/children/login-route.tsx`** — route `/login`: email + password form (react-hook-form + zod), sign-in, link to register
- [ ] **[NEW] `src/routes/children/register-account-route.tsx`** — route `/register-account`: email + password + confirm password
- [ ] **[MODIFY] `src/app.tsx`** — `beforeLoad` guard (unauthenticated → `/login`); authenticated layout: `<SideBar>` + `<Outlet>` + `<DisplayNameDialog>`
- [ ] **[MODIFY] `src/routes/router-config.tsx`** — register `loginRoute`, `registerAccountRoute`

**✅ Gate:** Unauthenticated visit → `/login`. Bad credentials → toast. Good credentials → main app. New account → login page.

---

## Phase 4 — Display Name Onboarding & User Settings

**Goal:** First-login display name dialog (non-dismissable). User icon in sidebar → settings dialog.

### `apps/web`

- [ ] **[NEW] `src/components/user/display-name-dialog.tsx`**
  - Triggered when `authAtom?.user.displayName === null`
  - Non-dismissable (no X, no Escape, no outside-click)
  - "Welcome! What should we call you?" → input (min 2 chars) → `PATCH /api/v1/auth/me` → update `authAtom`
- [ ] **[NEW] `src/components/user/user-settings-dialog.tsx`**
  - Opens from sidebar user section
  - Shows avatar (initials), editable display name, read-only email
  - "Save Changes" → `PATCH /api/v1/auth/me` → update `authAtom`
  - "Log Out" → `clearAuth()` → `/login`
- [ ] **[MODIFY] `src/components/side-bar.tsx`**
  - Fix Register WFH `to="/register"`
  - Add `flex-1` spacer
  - Add user section at bottom: avatar circle (initials) + display name + email → opens `<UserSettingsDialog>`
- [ ] **[MODIFY] `src/app.tsx`** — mount `<DisplayNameDialog>` in authenticated layout

**✅ Gate:** New user → dialog immediately, cannot bypass. Name set → sidebar updates. User click → settings pre-filled. Logout works.

---

## Phase 5 — Frontend Dashboard Tab

**Goal:** Dashboard route with 3 metric cards + skeleton loading.

### `apps/web`

- [ ] **[NEW] `src/routes/children/dashboard-route.tsx`** — route `/`: fetch `GET /api/v1/dashboard/stats` via React Query
  - Card: 📅 **Next WFH** — next scheduled date (GMT+7) or "Not scheduled"
  - Card: 📆 **This Month** — WFH day count this calendar month
  - Card: 📊 **This Year** — WFH day count this year
  - Skeleton loaders while fetching
- [ ] **[NEW] `src/routes/children/register-wfh-route.tsx`** — route `/register` (shell, filled in Phase 6)
- [ ] **[MODIFY] `src/routes/router-config.tsx`** — register `dashboardRoute`, `registerWfhRoute`

**✅ Gate:** Dashboard shows real stats. Sidebar navigation works between tabs.

---

## Phase 6 — Frontend Register WFH Tab (Weekly Board)

**Goal:** Full weekly board UI — week navigation, team grid, color chips, register/cancel.

### `apps/web`

- [ ] **[NEW] `src/components/wfh/week-selector.tsx`**
  - Shows "Week 32 · Aug 3 – Aug 9, 2026"
  - `<` / `>` week navigation, calendar popover for date jump
  - Drives `currentWeekAtom` (`{ year, weekNumber, startDate, endDate }`)
- [ ] **[NEW] `src/components/wfh/color-badge.tsx`** — pill with colored dot + display name
  - Colors: Blue `#3B82F6` · Yellow `#EAB308` · Green `#22C55E` · Purple `#A855F7` · Orange `#F97316`
- [ ] **[NEW] `src/components/wfh/week-board.tsx`**
  - 7-column grid (Mon–Sun), Google Calendar–style
  - Mon–Fri: active — registration chips + "Register" button in footer
  - Sat–Sun: greyed out, "N/A", no buttons
  - "Register" disabled if current user already registered that week
  - Future registration owned by current user shows "Cancel" link
  - Fetches `GET /api/v1/schedules?year=&weekNumber=` (refetches on week change)
- [ ] **[NEW] `src/components/wfh/register-dialog.tsx`** — "Register WFH for [Day, Date]?" confirmation → `POST /api/v1/schedules` → invalidate cache
- [ ] **[NEW] `src/components/wfh/cancel-dialog.tsx`** — "Cancel WFH on [Day, Date]?" confirmation → `DELETE /api/v1/schedules/:id` → invalidate cache
- [ ] **[MODIFY] `src/routes/children/register-wfh-route.tsx`** — compose `<WeekSelector />` + `<WeekBoard />`

**✅ Gate:** Colors correct per FCFS. Register → board updates. Cancel future day → chip removed. Past chips no Cancel. Sat/Sun blocked.

---

## Phase 7 — Firebase Deployment

**Goal:** `firebase deploy` ships both the SPA and Express API.

### Root

- [ ] **[NEW] `firebase.json`**
  ```json
  {
    "hosting": {
      "public": "apps/web/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        { "source": "/api/**", "function": "api" },
        { "source": "**", "destination": "/index.html" }
      ]
    },
    "functions": {
      "source": "apps/server"
    }
  }
  ```
- [ ] **[NEW] `.firebaserc`** — `{ "projects": { "default": "wfh-weekly-register" } }`

### `apps/server`

- [ ] **[MODIFY] `package.json`** — add `firebase-functions`, `engines: { "node": "20" }`
- [ ] **[NEW] `src/index.ts`** — Cloud Functions entry point:
  ```ts
  import { onRequest } from "firebase-functions/v2/https";
  import { app } from "./server";
  export const api = onRequest({ region: "asia-southeast1" }, app);
  ```
- [ ] **[MODIFY] `src/server.ts`** — export `app` as named export; guard `app.listen` with `if (process.env.NODE_ENV !== "production")`

### `apps/web`

- [ ] **[NEW] `.env.production`** — `VITE_API_BASE_URL=` (empty = same-origin, routes via Hosting rewrite)

**✅ Gate:** `firebase deploy` succeeds. `https://wfh-weekly-register.web.app` loads. API calls route through Cloud Function.

---

## Phase 8 — Polish & Error Handling

- [ ] React error boundary wrapping `<Outlet>`
- [ ] 401 auto-logout in `api-client.ts`
- [ ] Sonner toasts for all API errors and successes
- [ ] Zod validation on all backend request bodies
- [ ] Skeleton loaders on all async data
- [ ] Light theme consistency audit (no dark-mode bleed)
- [ ] Zod schema for all backend request bodies

---

## Full File Change Summary

```
(root)/
  firebase.json                                     [NEW — Phase 7]
  .firebaserc                                       [NEW — Phase 7]

apps/
  server/
    .env                                            [NEW — Phase 1, gitignored]
    src/
      lib/
        firebase-admin.ts                           [NEW — Phase 1]
        color.util.ts                               [NEW — Phase 2]
        date.util.ts                                [NEW — Phase 2]
      middleware/
        auth.middleware.ts                          [NEW — Phase 1]
      routes/
        auth.routes.ts                              [NEW — Phase 1]
        schedule.routes.ts                          [NEW — Phase 2]
        dashboard.routes.ts                         [NEW — Phase 2]
      index.ts                                      [NEW — Phase 7]
      server.ts                                     [MODIFY — Phase 1, 2, 7]
    package.json                                    [MODIFY — Phase 1, 7]

  web/
    .env                                            [NEW — Phase 3, gitignored]
    .env.production                                 [NEW — Phase 7]
    src/
      lib/
        api-client.ts                               [NEW — Phase 3]
        auth.store.ts                               [NEW — Phase 3]
      components/
        side-bar.tsx                                [MODIFY — Phase 4]
        user/
          display-name-dialog.tsx                   [NEW — Phase 4]
          user-settings-dialog.tsx                  [NEW — Phase 4]
        wfh/
          week-selector.tsx                         [NEW — Phase 6]
          week-board.tsx                            [NEW — Phase 6]
          color-badge.tsx                           [NEW — Phase 6]
          register-dialog.tsx                       [NEW — Phase 6]
          cancel-dialog.tsx                         [NEW — Phase 6]
      routes/
        children/
          login-route.tsx                           [NEW — Phase 3]
          register-account-route.tsx                [NEW — Phase 3]
          dashboard-route.tsx                       [NEW — Phase 5]
          register-wfh-route.tsx                    [NEW — Phase 5, 6]
        router-config.tsx                           [MODIFY — Phase 3, 5]
      app.tsx                                       [MODIFY — Phase 3, 4]
```

---

## Verification Checklist

| # | Check | Phase | Status |
|---|---|---|---|
| 1 | `POST /api/v1/auth/register` creates user in Firebase Auth console | 1 | [ ] |
| 2 | `POST /api/v1/auth/login` returns valid `idToken` | 1 | [ ] |
| 3 | `GET /api/v1/auth/me` returns user profile | 1 | [ ] |
| 4 | `PATCH /api/v1/auth/me` updates displayName in Firebase Auth + Firestore | 1 | [ ] |
| 5 | Weekend date `POST /schedules` → 400 | 2 | [ ] |
| 6 | 5 sequential POSTs → `registrationOrder` 1–5; 6th → 409 | 2 | [ ] |
| 7 | `DELETE` on past/today WFH date → 400 | 2 | [ ] |
| 8 | All API dates returned in GMT+7 | 2 | [ ] |
| 9 | Unauthenticated visit to `/` → `/login` | 3 | [ ] |
| 10 | Bad credentials → error toast | 3 | [ ] |
| 11 | New user (no displayName) → onboarding dialog immediately after login | 4 | [ ] |
| 12 | Onboarding dialog cannot be dismissed without entering a name | 4 | [ ] |
| 13 | Sidebar shows initials + display name after onboarding | 4 | [ ] |
| 14 | Sidebar user click → settings dialog pre-filled, change works | 4 | [ ] |
| 15 | Logout → token cleared → `/login` | 4 | [ ] |
| 16 | Dashboard shows correct stats from API | 5 | [ ] |
| 17 | Week board shows correct FCFS colors | 6 | [ ] |
| 18 | Register on weekday → board updates, button disabled for week | 6 | [ ] |
| 19 | Cancel future WFH → chip removed from board | 6 | [ ] |
| 20 | Sat/Sun columns fully blocked | 6 | [ ] |
| 21 | `firebase deploy` succeeds | 7 | [ ] |
| 22 | Prod URL loads, API calls work end-to-end | 7 | [ ] |
