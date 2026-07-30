# Technical Specification: Team WFH Tracker App

## 1. Overview & Objective
An internal web application allowing a 5-member team to register, manage, and view their Work-From-Home (WFH) schedules. The system features dynamic weekly user-color assignments, individual user dashboards, a flexible calendar picker, and Firebase integration managed strictly through a dedicated **Express.js Backend API**.

---

## 2. Business Logic & Rules
* **User Capacity & Overlap:** 5 team members. **All 5 members are permitted to select the same day for WFH.**
* **Registration Rules:**
  * Each member can select **1 WFH day per week**.
  * Registration is restricted to **Monday through Friday** (Saturday and Sunday are strictly locked/disabled).
* **Dynamic Color Assignment per Week:**
  * Colors are assigned on a **first-come, first-served (FCFS)** basis for each week based on the order users submit their registrations.
  * **Color Order Palette:**
    1. 1st User to register in the week: **Blue**
    2. 2nd User: **Yellow**
    3. 3rd User: **Green**
    4. 4th User: **Purple**
    5. 5th User: **Orange**
  * Color assignments **reset every week**.

---

## 3. System Architecture & Tech Stack

> **Strict Architectural Guardrail:** The Frontend is completely decoupled from Firebase. It **cannot** use the Firebase Client SDK or access Firebase services directly. All database access (Firestore) and user authentication/authorization checks must go exclusively through the Express.js Backend API via `firebase-admin`.

```
+--------------------------+
|  Frontend (React/Next)   |
+--------------------------+
             │
             │ HTTPS / JSON REST APIs (Bearer Token)
             ▼
+--------------------------+
|   Express.js Backend     |  <-- Handles Auth Validation, Business Logic, 
+--------------------------+      & Firebase Admin SDK Initialization
             │
             │ Firebase Admin SDK
             ▼
+--------------------------+
|    Firebase Services     |
| (Authentication & DB)    |
+--------------------------+
```

| Layer | Technology | Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js / Tailwind | Dashboard UI, week calendar view, date picker, submitting authentication credentials and data requests to Express.js. |
| **Backend API** | Node.js + Express.js | Exposes REST endpoints, validates session JWTs, executes business logic (color sequence, date locks), interacts with Firebase Admin SDK. |
| **Auth & Database** | Firebase Auth & Firestore | Managed strictly by Express.js via `firebase-admin`. Stores user credentials and registration documents. |

---

## 4. Database Schema (Firebase Firestore via Express Backend)

### Collection: `users`
```json
{
  "uid": "usr_abc123",
  "email": "alex@company.com",
  "displayName": "Alex Rivera",
  "createdAt": "2026-01-01T08:00:00Z"
}
```

### Collection: `wfh_registrations`
```json
{
  "id": "reg_2026_w31_usr_abc123",
  "userId": "usr_abc123",
  "wfhDate": "2026-08-03", // YYYY-MM-DD (must be Mon-Fri)
  "weekNumber": 31,
  "year": 2026,
  "registrationOrder": 1, // 1 to 5 (determines color assignment)
  "createdAt": "2026-07-31T01:45:00Z",
  "updatedAt": "2026-07-31T01:45:00Z"
}
```

---

## 5. Express.js Backend API Endpoints

All protected endpoints require `Authorization: Bearer <JWT_TOKEN>` verified by Express middleware calling `admin.auth().verifyIdToken(token)`.

### **1. Authentication Endpoints**
* `POST /api/v1/auth/login`
  * **Payload:** `{ "email": "...", "password": "..." }`
  * **Description:** Express authenticates credentials using Firebase REST API / Admin SDK and returns an session/ID token back to FE.
* `GET /api/v1/auth/me`
  * **Description:** Returns profile info of current logged-in user.

### **2. Dashboard Stats Endpoint**
* `GET /api/v1/dashboard/stats`
  * **Description:** Express calculates metrics directly from Firestore queries.
  * **Response:**
    ```json
    {
      "nextWfhDate": "2026-08-03",
      "wfhDaysCountThisMonth": 4,
      "wfhDaysCountThisYear": 32
    }
    ```

### **3. WFH Registration & Calendar Endpoints**
* `GET /api/v1/schedules`
  * **Query Params:** `year`, `weekNumber` (or `date`)
  * **Description:** Retrieves all team registrations for the week, annotated with their computed `registrationOrder` and color code.
* `POST /api/v1/schedules`
  * **Body:** `{ "wfhDate": "2026-08-05" }`
  * **Express Processing Rules:**
    1. Reject if `wfhDate` is a Saturday or Sunday.
    2. Check existing entries for target `year` and `weekNumber`.
    3. Assign `registrationOrder = existing_week_registrations_count + 1`.
    4. Save to Firestore via Firebase Admin SDK.
* `DELETE /api/v1/schedules/:id`
  * **Description:** Cancels/deletes registration from Firestore.

---

## 6. User Interface & Layout Structure

### **Tab 1: Personal Dashboard**
* **Metrics Cards:**
  * **Upcoming WFH:** Next scheduled WFH date.
  * **Monthly Usage:** Total WFH days taken/scheduled in the current calendar month.
  * **Yearly Usage:** Total WFH days taken/scheduled in the current year.

---

### **Tab 2: WFH Registration & Weekly View**

#### **Top Control Bar**
* Date picker with Day / Week / Month / Year selection. Picking a date displays the full containing week (**Monday to Sunday**).

#### **Weekly Board Layout**

```text
+---------------------------------------------------------------------------------------+
|  Top Selector: [ Calendar Picker: Aug 5, 2026 ]  < Week 32, Aug 3 - Aug 9, 2026 >    |
+---------------------------------------------------------------------------------------+
|  Mon (Aug 3) | Tue (Aug 4) | Wed (Aug 5) | Thu (Aug 6) | Fri (Aug 7) | Sat | Sun      |
|  ------------|-------------|-------------|-------------|-------------|-----|--------  |
|  [User A]    | [User B]    | [User A]    |             | [User E]    |     |          |
|  (Blue - #1) | (Blue - #1) | (Blue - #1) |             | (Blue - #1) |  B  |   B      |
|              |             |             |             |             |  L  |   L      |
|  [User C]    |             | [User D]    |             |             |  O  |   O      |
|  (Yellow-#2) |             | (Yellow-#2) |             |             |  C  |   C      |
|              |             |             |             |             |  K  |   K      |
|              |             | [User E]    |             |             |  E  |   E      |
|              |             | (Green -#3) |             |             |  D  |   D      |
|  ------------|-------------|-------------|-------------|-------------|-----|--------  |
|  [ Register ]| [ Register ]| [ Register ]| [ Register ]| [ Register ]| N/A |  N/A     |
+---------------------------------------------------------------------------------------+
```

---

## 7. Security & Validation Rules
1. **Zero Direct Client Access:** Firebase client SDKs are absent from the frontend bundle. All actions route to `https://api.yourdomain.com/api/v1/...`.
2. **Server-Side Authorization:** Express validates the bearer token via `admin.auth().verifyIdToken()` middleware on every protected API call.
3. **Strict Weekend Lockout:** Express validates incoming dates and returns `400 Bad Request` if a user attempts to register for a Saturday or Sunday.
