# MVP 0.3 Part 2 Changelog - Antifraud, Push & Finance

## Overview
Implemented Part 2 of MVP 0.3, focusing on security (antifraud check-in), engagement (push notifications), and management (finance & admin panels).

## Database Changes
New migration file created: `gym-panel/supabase_migrations_mvp_0_3_part2.sql`

1.  **Table `users`**: Added `push_token` and `role`.
2.  **Table `academies`**: Added `active`, `lat`, `long`.
3.  **Table `payouts`**: Created for financial history.
4.  **RPC `perform_checkin`**: Secure check-in logic (Location, Plan, Daily Limit).
5.  **RPC `get_admin_stats`**: Aggregated stats for admin panel.

## Mobile App Changes (`fitness-app`)

### 1. Check-in Flow (`app/academy/[id].tsx`)
*   **Removed QR Code**: Check-in is now fully digital and location-based.
*   **Antifraud**: Uses `perform_checkin` RPC to validate:
    *   User location vs Academy location (300m radius).
    *   Active Plan.
    *   Daily Limit (1/day).
*   **UI**: Added loading states ("Avaliando localização...") and success/error modals.

### 2. Push Notifications
*   **Setup**: Installed `expo-notifications`.
*   **Registration**: App registers push token on login (`src/services/notificationService.ts`).
*   **Logic**: Token saved to `users` table.

## Web Panel Changes (`gym-panel`)

### 1. Admin Panel (`/admin`)
*   Protected route (checks `users.role = 'admin'`).
*   Displays system stats (Users, Academies, Check-ins).
*   Lists academies with status.

### 2. Finance Dashboard (`/dashboard/finance`)
*   For Academy Owners.
*   Shows current month check-ins and estimated revenue (R$ 15/check-in).
*   Lists payout history.

### 3. API Endpoints
*   `POST /api/notifications/send`: Send push notification to a user.
*   `GET /api/cron/daily-streak`: Cron job endpoint to re-engage users.

## How to Test

### 1. Database Setup
*   Run `gym-panel/supabase_migrations_mvp_0_3_part2.sql` in Supabase.
*   **Important**: Manually set an academy's `lat` and `long` to your current location for testing check-in success.
    *   Example: `UPDATE academies SET lat = -23.5505, long = -46.6333 WHERE id = '...';`
*   Set your user role to 'admin' to access `/admin`.
    *   `UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';`

### 2. Mobile Check-in
*   Open App -> Select Academy.
*   Click "Fazer Check-in Agora".
*   Grant Location Permission.
*   **Success**: If close to academy coordinates.
*   **Fail**: If far away or plan inactive.

### 3. Push Notifications
*   Login on mobile (token will be saved).
*   Send a test notification via Postman/Curl:
    ```bash
    curl -X POST http://localhost:3000/api/notifications/send \
    -H "Content-Type: application/json" \
    -d '{"userId": "YOUR_USER_ID", "title": "Test", "body": "Hello World"}'
    ```

### 4. Admin & Finance
*   Access `http://localhost:3000/admin` (must be admin).
*   Access `http://localhost:3000/dashboard/finance` (must be owner).
