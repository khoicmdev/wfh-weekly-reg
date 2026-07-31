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

- [x] **[MODIFY] `package.json`** — add `firebase-admin`, `dotenv`
- [x] **[NEW] `.env`** — populate with Firebase credentials (gitignored)
  ```
  FIREBASE_PROJECT_ID=wfh-weekly-register
  FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@wfh-weekly-register.iam.gserviceaccount.com
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
  FIREBASE_WEB_API_KEY=AIzaSyAv5i6KjmcoxB8hJfZwkH7tScNfk0dJwAE
  PORT=3001
  CORS_ORIGIN=http://localhost:3000
  ```
- [x] **[NEW] `src/lib/firebase-admin.ts`** — init Admin SDK, export `adminAuth` + `adminDb`
- [x] **[NEW] `src/middleware/auth.middleware.ts`** — `verifyToken`: Bearer → `verifyIdToken()` → `req.user`
- [x] **[NEW] `src/routes/auth.routes.ts`** — endpoints:
  - `POST /api/v1/auth/register` — `adminAuth.createUser()` + Firestore `users/{uid}` doc (`displayName: null`)
  - `POST /api/v1/auth/login` — Firebase Auth REST `signInWithPassword` → returns `{ token, refreshToken }`
  - `GET /api/v1/auth/me` *(protected)* — returns Firestore `users/{uid}`
  - `PATCH /api/v1/auth/me` *(protected)* — updates `displayName` in Firebase Auth + Firestore
- [x] **[MODIFY] `src/server.ts`** — load dotenv, mount `authRouter`, restrict CORS to `CORS_ORIGIN`

**✅ Gate:** Register → user visible in Firebase Console. Login → valid `idToken`. `PATCH /me` → displayName updated in both places.

---

## Phase 2 — Backend Schedule & Dashboard Endpoints

**Goal:** WFH CRUD with FCFS color assignment, weekend lockout, cancel-before-day guard.

### `apps/server`

- [x] **[NEW] `src/lib/color.util.ts`** — `registrationOrder` (1–5) → `{ name, hex }` (Blue/Yellow/Green/Purple/Orange)
- [x] **[NEW] `src/lib/date.util.ts`** — GMT+7-aware helpers: `getISOWeek()`, `isWeekend()`, `isPastOrToday()` (`DD-MM-YYYY` support)
- [x] **[NEW] `src/lib/date.util.test.ts`** — unit tests for date & color utilities (5 passing tests via `npm test`)
- [x] **[NEW] `src/routes/schedule.routes.ts`** — endpoints:
  - `GET /api/v1/schedules?year=&weekNumber=` *(protected)* — team schedule annotated with colors
  - `POST /api/v1/schedules` *(protected)* — body `{ wfhDate }`: validate date, reject weekend (400), reject duplicate user+week (409), assign `registrationOrder`, save to Firestore
  - `DELETE /api/v1/schedules/:id` *(protected)* — reject if date is today/past (400), verify ownership (403), delete
- [x] **[NEW] `src/routes/dashboard.routes.ts`** — `GET /api/v1/dashboard/stats` *(protected)*: `{ nextWfhDate, wfhDaysCountThisMonth, wfhDaysCountThisYear }` in GMT+7
- [x] **[MODIFY] `src/server.ts`** — mount `scheduleRouter`, `dashboardRouter`

**✅ Gate:** Weekend POST → 400. 5 POSTs → `registrationOrder` 1–5. 6th → 409. DELETE past date → 400. GET returns colors correctly.

---

## Phase 3 — Frontend Auth Flow

**Goal:** `/login` + `/register-account` routes, auth state, route guard.

### `apps/web`

- [x] **[NEW] `.env`** — `VITE_API_BASE_URL=http://localhost:3001`
- [x] **[NEW] `src/lib/api-client.ts`** — fetch wrapper: base URL from env, Bearer token from localStorage, auto-logout on 401
- [x] **[NEW] `src/lib/auth.store.ts`** — localStorage helpers: `getStoredAuth()`, `setStoredAuth()`, `clearStoredAuth()` with `AuthState { token, user: { uid, email, displayName } }`
- [x] **[NEW] `src/routes/children/login-route.tsx`** — route `/login`: email + password form, sign-in, link to register
- [x] **[NEW] `src/routes/children/register-account-route.tsx`** — route `/register-account`: email + password + confirm password, redirects to `/login`
- [x] **[MODIFY] `src/app.tsx`** — `beforeLoad` guard (unauthenticated → `/login`, authenticated → skip auth pages); split public layout vs authenticated layout with `<SideBar>`
- [x] **[MODIFY] `src/routes/router-config.tsx`** — register `loginRoute`, `registerAccountRoute`

**✅ Gate:** Unauthenticated visit → `/login`. Bad credentials → toast. Good credentials → main app. New account → login page.

---

## Phase 4 — Display Name Onboarding & User Settings

**Goal:** First-login display name dialog (non-dismissable). User icon in sidebar → settings dialog.

### `apps/web`

- [x] **[NEW] `src/components/user/display-name-dialog.tsx`**
  - Triggered when `auth.user.displayName === null` (reads localStorage directly)
  - Non-dismissable (no X, Escape blocked, outside-click blocked)
  - "Welcome! What should we call you?" → input (min 2 chars) → `PATCH /api/v1/auth/me` → update localStorage + parent state
- [x] **[NEW] `src/components/user/user-settings-dialog.tsx`**
  - Opens from sidebar user section
  - Shows avatar (initials), editable display name, read-only email
  - "Save Changes" → `PATCH /api/v1/auth/me` → update localStorage
  - "Log Out" → `clearStoredAuth()` → `/login`
  - Exports `getInitials()` helper used by sidebar
- [x] **[MODIFY] `src/components/side-bar.tsx`**
  - Fixed Register WFH `to="/register"` (cast for Phase 5)
  - Added `flex-1` spacer
  - Added user section at bottom: avatar (initials) + display name + email → opens `<UserSettingsDialog>`
- [x] **[MODIFY] `src/app.tsx`** — mounted `<DisplayNameDialog>` in authenticated layout with `onSaved` state callback

**✅ Gate:** New user → dialog immediately, cannot bypass. Name set → sidebar updates. User click → settings pre-filled. Logout works.

---

## Phase 5 — Frontend Dashboard Tab

**Goal:** Dashboard route with 3 metric cards + skeleton loading.

### `apps/web`

- [x] **[NEW] `src/routes/children/dashboard-route.tsx`** — route `/`: fetch `GET /api/v1/dashboard/stats` via React Query
  - Card: 📅 **Next WFH** — next scheduled date (GMT+7, formatted) or "Not scheduled"
  - Card: 📆 **This Month** — WFH day count this calendar month
  - Card: 📊 **This Year** — WFH day count this year
  - Skeleton loaders while fetching; error banner on failure
- [x] **[NEW] `src/routes/children/register-wfh-route.tsx`** — route `/register` (shell placeholder, filled in Phase 6)
- [x] **[MODIFY] `src/routes/router-config.tsx`** — replaced `indexRoute` with `dashboardRoute` at `/`; added `registerWfhRoute`; removed `as any` cast from sidebar `/register` link

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
        date.util.test.ts                           [NEW — Phase 2]
      middleware/
        auth.middleware.ts                          [NEW — Phase 1]
      routes/
        auth.routes.ts                              [NEW — Phase 1]
        schedule.routes.ts                          [NEW — Phase 2]
        dashboard.routes.ts                         [NEW — Phase 2]
      index.ts                                      [NEW — Phase 7]
      server.ts                                     [MODIFY — Phase 1, 2, 7]
    package.json                                    [MODIFY — Phase 1, 2, 7]

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
| 1 | `POST /api/v1/auth/register` creates user in Firebase Auth console | 1 | [x] |
| 2 | `POST /api/v1/auth/login` returns valid `idToken` | 1 | [x] |
| 3 | `GET /api/v1/auth/me` returns user profile | 1 | [x] |
| 4 | `PATCH /api/v1/auth/me` updates displayName in Firebase Auth + Firestore | 1 | [x] |
| 5 | Weekend date `POST /schedules` → 400 | 2 | [x] |
| 6 | 5 sequential POSTs → `registrationOrder` 1–5; 6th → 409 | 2 | [x] |
| 7 | `DELETE` on past/today WFH date → 400 | 2 | [x] |
| 8 | All API dates returned in GMT+7 | 2 | [x] |
| 9 | Unauthenticated visit to `/` → `/login` | 3 | [x] |
| 10 | Bad credentials → error toast | 3 | [x] |
| 11 | New user (no displayName) → onboarding dialog immediately after login | 4 | [x] |
| 12 | Onboarding dialog cannot be dismissed without entering a name | 4 | [x] |
| 13 | Sidebar shows initials + display name after onboarding | 4 | [x] |
| 14 | Sidebar user click → settings dialog pre-filled, change works | 4 | [x] |
| 15 | Logout → token cleared → `/login` | 4 | [x] |
| 16 | Dashboard shows correct stats from API | 5 | [x] |
| 17 | Week board shows correct FCFS colors | 6 | [ ] |
| 18 | Register on weekday → board updates, button disabled for week | 6 | [ ] |
| 19 | Cancel future WFH → chip removed from board | 6 | [ ] |
| 20 | Sat/Sun columns fully blocked | 6 | [ ] |
| 21 | `firebase deploy` succeeds | 7 | [ ] |
| 22 | Prod URL loads, API calls work end-to-end | 7 | [ ] |
