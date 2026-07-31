# 🏢 TLG Legal — WFH Weekly Registration System

> A modern, color-coded Work From Home (WFH) registration platform built for TLG Legal. Enables team members to easily register, view, and manage weekly WFH schedules with First-Come-First-Served (FCFS) color assignments and strict business rule enforcement.

![Live Deployment](https://img.shields.io/badge/Production-https%3A%2F%2Ftlg--legal.web.app-blue)
![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%26%20Cloud%20Functions%20v2-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-Monorepo-3178C6)

---

## 🎯 Mission & Purpose

Managing team work-from-home days requires transparency, fairness, and strict date guards. The **TLG Legal WFH System** solves this by providing:

1. **Fair FCFS Color Badging**: Automatically assigns vibrant color pills (Blue, Yellow, Green, Purple, Orange) to team members based on their registration order for each week.
2. **Strict Business Rules**:
   - **One WFH Day per User per Week**: Enforced atomically via backend transactions.
   - **Weekend Lockout**: Saturday and Sunday registrations are completely blocked.
   - **Cancel Guard**: Users can only cancel future WFH registrations; past and same-day registrations are locked.
3. **Multi-Density Calendar Views**: View schedules in **Monthly** (dynamic 4–6 week view), **Biweekly** (2 weeks), or **Weekly** (1 week) layouts.
4. **Verified Authentication**: Secure account creation protected by a 6-digit email OTP verification code.

---

## 🏗️ System Architecture

The project is structured as a **Turborepo monorepo** separating the React SPA frontend, Express backend API, and shared design system packages.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser Client                       │
│            React 19 + Vite + TanStack Router            │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / JSON
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Firebase Hosting                        │
│             https://tlg-legal.web.app                   │
│  Rewrites /api/** ─────────────────┐                    │
└────────────────────────────────────┼────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────┐
│       Backend API (Firebase Cloud Functions v2)         │
│          Express.js 5 API (region: asia-southeast1)     │
└────────────────────────────┬────────────────────────────┘
                             │ Firebase Admin SDK
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  Firebase Platform                      │
│            Firebase Auth + Firestore Database           │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Frontend**: React 19, Vite, TanStack Router, TanStack Query (React Query), Tailwind CSS, Lucide React, Sonner (Toaster), Jotai.
- **Backend**: Express.js 5, Firebase Admin SDK, Firebase Cloud Functions v2 (`asia-southeast1`), Zod validation.
- **Monorepo**: Turborepo, npm workspaces, TypeScript.
- **CI/CD**: GitHub Actions (`lint` $\rightarrow$ `build` $\rightarrow$ parallel deploy to Firebase Hosting & Functions).

---

## 📁 Repository Structure

```
wfh-weekly-reg/
├── apps/
│   ├── web/                     # React 19 / Vite SPA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── user/        # Display name onboarding & settings dialogs
│   │   │   │   └── wfh/         # BoardHeader, WeekBoard, ColorBadge, Register/Cancel Dialogs
│   │   │   ├── routes/          # TanStack Router route definitions (Dashboard, Register WFH, Auth)
│   │   │   └── lib/             # API client & reactive auth store (useSyncExternalStore)
│   │   └── public/              # Brand assets (tlg_ico.PNG)
│   │
│   └── server/                  # Express REST API & Cloud Function entry
│       └── src/
│           ├── routes/          # auth.routes.ts, schedule.routes.ts, dashboard.routes.ts
│           ├── middleware/      # auth.middleware.ts (Bearer token verification)
│           ├── lib/             # firebase-admin.ts, date.util.ts, color.util.ts
│           └── index.ts         # Cloud Functions v2 onRequest entry
│
├── packages/
│   ├── ui/                      # Shared UI primitive library (@repo/ui)
│   └── shared/                  # Shared types & utilities (@repo/shared)
│
├── .github/workflows/
│   └── deploy.yml               # Automated CI/CD pipeline
├── firebase.json                # Hosting rewrites & Cloud Functions config
└── .firebaserc                  # Target Firebase project (tlg-legal / wfh-weekly-register)
```

---

## ✨ Key Features

### 1. 📅 Register WFH Board (3 View Modes)
- **Monthly View (Default)**: Dynamically calculates 4–6 week rows covering all days of the month. Days outside the current month are automatically disabled (`cursor-not-allowed`).
- **Biweekly View**: Displays 2 consecutive week rows.
- **Weekly View**: Displays 1 week row.
- **Today Shortcut**: Snaps calendar view back to the period containing today.

### 2. 🎨 FCFS Color Assignment
- 1st to register in a week: **Blue** (`#3B82F6`)
- 2nd to register: **Yellow** (`#EAB308`)
- 3rd to register: **Green** (`#22C55E`)
- 4th to register: **Purple** (`#A855F7`)
- 5th to register: **Orange** (`#F97316`)

### 3. 📊 Dashboard
- Stacks 3 real-time metric cards vertically in 3 rows:
  - 📅 **Next WFH**: Displays upcoming scheduled WFH date.
  - 📆 **This Month**: Count of registered WFH days in the current calendar month.
  - 📊 **This Year**: Total count of registered WFH days in the current year.

### 4. 🔑 Account Security & Onboarding
- **2-Step 6-Digit OTP Email Verification**: Requires code verification before account creation.
- **Display Name Onboarding**: Non-dismissable modal on first login requiring users to set their display name.
- **User Settings**: Profile dialog allowing display name updates and sign out.

---

## 💻 Local Development

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: v10+

### Setup Steps

1. **Clone repository & install dependencies**:
   ```bash
   git clone <repository-url>
   cd wfh-weekly-reg
   npm install
   ```

2. **Configure environment variables**:
   - `apps/server/.env`:
     ```env
     PORT=3001
     CORS_ORIGIN=http://localhost:3000
     FIREBASE_PROJECT_ID=wfh-weekly-register
     FIREBASE_CLIENT_EMAIL=your-service-account-email
     FIREBASE_PRIVATE_KEY="your-service-account-private-key"
     FIREBASE_WEB_API_KEY=your-firebase-web-api-key
     ```
   - `apps/web/.env`:
     ```env
     VITE_API_BASE_URL=http://localhost:3001
     ```

3. **Start local development servers**:
   ```bash
   npm run dev
   ```
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001`

---

## 🚀 Deployment & CI/CD

This repository uses **GitHub Actions** for automated CI/CD:

- **Trigger**: Any push to the `main` branch.
- **Workflow Steps**:
  1. **Lint & Typecheck**: Runs `npm run lint` across all packages (`tsc --noEmit` & ESLint).
  2. **Build**: Builds `apps/web` and `apps/server`.
  3. **Parallel Deploy**: Concurrently deploys **Hosting** (`https://tlg-legal.web.app`) and **Cloud Functions** (`asia-southeast1`).

### Live Environment

- **Production App**: [https://tlg-legal.web.app](https://tlg-legal.web.app)
- **Firebase Project Console**: `wfh-weekly-register`
