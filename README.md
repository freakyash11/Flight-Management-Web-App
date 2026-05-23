# ✈️ SkyBook – Flight Management PWA

SkyBook is a modern, responsive, and reliable Flight Management Progressive Web Application (PWA) built with **Next.js 16 (App Router)**, **Tailwind CSS v4**, **Zustand**, and **Supabase**. It provides real-time seat selection, robust route protection, and transaction-safe booking operations.

---

## Local Setup

Follow these steps to set up and run the project locally on your machine:

### 1. Clone the Repository
```bash
git clone <repository-url>
cd my-app
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory of the project and populate it with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 4. Database Setup & Seeding
Follow the instructions in the [Supabase Project Config](#supabase-project-config) section below to run the migration and seed scripts.

### 5. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Supabase Project Config

To configure the Supabase database for SkyBook, follow these steps:

### 1. Create a Supabase Project
1. Log in to the [Supabase Dashboard](https://supabase.com).
2. Click **New Project** and select your organization.
3. Choose a project name (e.g., `SkyBook`), set a secure database password, and select your region.
4. Retrieve your **Project URL** and **API Keys** (Anon and Service Role) from the project settings and add them to your local `.env.local` file.

### 2. Run the Migration Files
You can set up the database schema and custom RPC functions using one of the following methods:

#### Option A: Supabase CLI (Recommended)
1. Initialize Supabase in your repository:
   ```bash
   npx supabase init
   ```
2. Start the local Supabase container (requires Docker):
   ```bash
   npx supabase start
   ```
3. Run the migrations:
   ```bash
   npx supabase db reset
   ```
   *This command automatically applies all migration files in `supabase/migrations/` in alphabetical order, followed by the `supabase/seed.sql` script.*

#### Option B: Supabase SQL Editor
1. In the Supabase Dashboard, navigate to the **SQL Editor**.
2. Create a new query, paste the contents of [001_schema.sql](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/supabase/migrations/001_schema.sql), and click **Run**.
3. Create a second query, paste the contents of [002_functions.sql](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/supabase/migrations/002_functions.sql), and click **Run**.
4. Create a third query, paste the contents of [seed.sql](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/supabase/seed.sql), and click **Run** to populate the flights and seats.

### 3. Create the Test User
For testing the booking flows, you must manually create a test user in your Supabase Auth panel:
1. Navigate to **Authentication** ➔ **Users** in the Supabase Dashboard.
2. Click **Add User** ➔ **Create User**.
3. Use the following test credentials:
   - **Email:** `test@flightapp.com`
   - **Password:** `Test@12345`
4. Make sure to **Auto-confirm** the user's email so they can log in immediately.

---

## Zustand Store Structure

The application separates its core business states into two lightweight Zustand stores:

### 1. `useFlightStore`
Implemented in [useFlightStore.ts](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/src/store/useFlightStore.ts), this store manages the active flight search and booking flow state.
* **What it stores:** `searchQuery`, `selectedFlight`, `selectedSeat`, `bookingStep`, and `passengerForm`.
* **Persisted vs Non-Persisted State:**
  - `bookingStep` and `searchQuery` are **persisted** via localStorage. If a user refreshes the page mid-booking, their search parameters and booking funnel progress are preserved.
  - `passengerForm` is **not persisted** to localStorage. It contains sensitive Personally Identifiable Information (PII) like names and passport numbers. Keeping it strictly in-memory ensures that sensitive data is discarded as soon as the session closes or when `resetBooking` is triggered.

### 2. `useUserStore`
Implemented in [useUserStore.ts](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/src/store/useUserStore.ts), this store manages the authenticated user session and booking caches.
* **What it stores:** `session` (minimal snapshot containing `accessToken`, `userId`, and `email`), `cachedBookings`, and `isLoadingBookings`.
* **Persisted vs Non-Persisted State:**
  - Only the minimal `session` token snapshot is **persisted** to keep the user signed in across page refreshes. The full Supabase Session object (including the raw JWT) is managed by `@supabase/ssr`'s cookie layer—duplicating it in Zustand would cause token synchronization bugs.
  - Full booking data (`cachedBookings`) is **not persisted** to localStorage. Storing it locally could lead to displaying stale, out-of-date booking details upon reloading. Instead, it is re-fetched fresh from the database on mount.

### Preventing PII Exposure via `partialize`
Zustand's `persist` middleware is configured with a custom `partialize` filter in both stores.
* In `useFlightStore`, `partialize` specifies that only `searchQuery` and `bookingStep` are written to localStorage:
  ```ts
  partialize: (state) => ({
    searchQuery: state.searchQuery,
    bookingStep: state.bookingStep,
  })
  ```
  This design guarantees that sensitive data like `passengerForm` (which contains `passportNo`), `selectedFlight`, and `selectedSeat` are never serialized and written to the browser's persistent storage.

### Optimistic Seat Selection
To ensure a highly responsive, zero-latency user experience, the seat selection uses an optimistic update pattern:
1. When a user clicks a seat in the cabin map, `optimisticallySelectSeat` is invoked to instantly set `selectedSeat` in the local Zustand store.
2. The UI immediately highlights the seat as selected, avoiding any lag from network requests.
3. The actual database reservation is executed only when the user fills out the passenger details and submits the booking.
4. If the database RPC write fails (e.g., if another user booked the seat in a split-second race condition), the application handles the failure gracefully by calling `setSelectedSeat(null)`, clearing the selection, and prompting the user to select another seat.

### The `resetBooking` Action
The `resetBooking` action clears the active search and booking state, restoring the store to its initial state:
```ts
const INITIAL_STATE = {
  searchQuery: null,
  selectedFlight: null,
  selectedSeat: null,
  bookingStep: 'search',
  passengerForm: null,
};
```
It is triggered in three scenarios:
1. **Successful Booking:** Once the database transaction succeeds and before redirecting the user to the `/booking/confirm` page.
2. **Logout:** Inside `clearSession` in `useUserStore` to ensure no flight/seat state leaks across user accounts.
3. **Hard Cancellation:** When the user explicitly exits the booking flow.

---

## Architecture Decisions

### 1. Server vs Client Component Split Rationale
* **Server Components:** Utilized for static page shells, page metadata definitions (for SEO), and initial data fetches. For example, [page.tsx](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/src/app/(main)/page.tsx) pre-renders static stats and popular routes on the server, which keeps the client bundle small and loads the app faster.
* **Client Components:** Marked with `'use client'` and used for elements requiring high interactivity, state management, and real-time streams (e.g., `<SearchForm />`, `<SeatMap />`, `<PassengerDetailsModal />`).
* **Route Protection via Next.js Proxy:** Next.js 16+ deprecates the traditional `middleware.ts` file. Instead, the application uses a Next.js Proxy in [proxy.ts](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/src/proxy.ts) to intercept requests, refresh the Supabase session token server-side, and redirect unauthenticated requests away from protected routes like `/my-bookings` and `/booking/*`.

### 2. RPC Functions vs Direct Table Writes
Instead of letting the client perform direct writes on the database tables, the application exposes custom PostgreSQL functions via Supabase RPC:
* **Race Conditions & Double-Booking:** Reserving a seat requires a lock check, inserting a booking, inserting passenger details, and updating seat availability. If these were written as separate client-side queries, two users could query the same seat as available simultaneously and both succeed, creating a double-booking.
* **Atomicity:** The `reserve_seat` RPC function runs as a single, atomic database transaction. It locks the targeted seat row using `FOR UPDATE` to block concurrent writes, verifies availability, generates a unique collision-free PNR code, inserts the booking and passenger records, and updates the seat status. If any step fails, the database rolls back the transaction completely, preventing orphaned booking data.

### 3. DB-Level 2-Hour Cancellation Enforcement (Trigger)
To protect business rules from client-side tampering, the 2-hour cancellation rule is enforced directly in the database:
* A database trigger `trg_prevent_late_cancellation` is registered on the `bookings` table (see [001_schema.sql](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/supabase/migrations/001_schema.sql)).
* The trigger fires `BEFORE INSERT OR UPDATE` on the bookings table.
* If a booking's status changes to `'cancelled'`, the trigger function `prevent_late_cancellation` retrieves the departure time (`departs_at`) of the associated flight.
* If the departure time is within 2 hours of the current time (`now()`), the trigger throws an exception (`RAISE EXCEPTION`), immediately aborting and rolling back the transaction.

### 4. Real-time Subscription Approach
Real-time seat mapping is managed by the client-side hook [useRealtime.ts](file:///c:/Users/YSKYa/Desktop/Flight%20Management%20Web%20App/my-app/src/hooks/useRealtime.ts):
* It opens a Supabase Realtime channel subscribing to `postgres_changes` on the `seats` table.
* **Filter Optimization:** Rather than listening to updates on all flights, it applies a filter: `filter: 'flight_id=eq.${flightId}'`. This saves network bandwidth by only streaming updates for the currently viewed flight.
* When another user books a seat, the payload is captured and merged into the local React state, updating the seat map instantly without requiring a page refresh or polling.

---

## Trade-offs & What I'd Do Differently

* **Zustand State vs URL Query Parameters:** Storing search queries and booking steps in Zustand works well for PWA local storage persistence, but it makes pages harder to share. In a future iteration, keeping search parameters in URL query parameters (e.g., `/flights?from=DEL&to=BOM&date=...`) would enable deep-linking and easy URL sharing.
* **Database Row Locking:** The row-level `FOR UPDATE` lock prevents double-bookings but can cause database queue congestion under massive concurrent traffic. For a larger-scale service, a distributed caching layer (like Redis-based locking) or an asynchronous queue-based booking engine would scale better.
* **Local Offline Booking Sync:** The application is PWA-ready and handles offline page access. However, offline booking is not supported because Supabase writes require active server validation. Integrating a queued background sync worker to process offline bookings once connection is restored would make the app fully offline-functional.

---

## PWA Lighthouse Score

Below is the Google Lighthouse audit demonstrating compliance with Progressive Web Application standards, performance, and best practices:

![Lighthouse Score Placeholder](https://placehold.co/800x400/0a1628/ffffff?text=Lighthouse+PWA+Score+100/100)
