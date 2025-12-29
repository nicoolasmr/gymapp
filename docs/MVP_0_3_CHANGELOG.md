# MVP 0.3 Changelog - Family Plan Invitation System

## Overview
Implemented a complete invitation system for the Family Plan, allowing owners to invite members via a secure link, manage members, and ensuring all security rules are met.

## Database Changes
New migration file created: `gym-panel/supabase_migrations_mvp_0_3.sql`

1.  **Table `users`**: Added `family_owner_id` column.
2.  **Table `family_invites`**: Created to store secure invite tokens.
3.  **RPC Functions**:
    *   `create_family_invite`: Generates token, checks limits (max 4).
    *   `accept_family_invite`: Validates token, links user to family.
    *   `remove_family_member`: Allows owner to remove members.
    *   `get_family_details`: Returns family status, members, and pending invites.

## Mobile App Changes

### 1. Profile Screen (`app/(tabs)/profile.tsx`)
*   Added "Membros da Família" section.
*   Lists active members and pending invites.
*   "Adicionar Membro" button generates and shares a deep link (`fitnessapp://invite?token=...`).
*   "Remover" button for owners to remove members.

### 2. Invite Screen (`app/invite.tsx`)
*   New screen to handle incoming invite links.
*   Validates the token and allows the user to accept the invite.
*   Redirects to Home upon success.

### 3. Deep Linking & Auth (`app/_layout.tsx`, `src/store/useAuthStore.ts`)
*   Configured deep linking handling.
*   Implemented logic to preserve the invite token if the user needs to login or sign up first.
*   Redirects back to the invite screen after successful authentication.

### 4. Services (`src/services/userService.ts`)
*   Updated to use the new RPC functions.

## How to Test
1.  **Apply Database Changes**: Run the SQL from `gym-panel/supabase_migrations_mvp_0_3.sql` in your Supabase SQL Editor.
2.  **Run the App**: `npx expo start`.
3.  **Owner Flow**:
    *   Login with a user who has a Family Plan (`plan_id = 2`).
    *   Go to Profile -> Click "+ Adicionar Membro".
    *   Copy the generated link.
4.  **Invitee Flow**:
    *   Open the link on the device (or use `npx uri-scheme open "fitnessapp://invite?token=YOUR_TOKEN"`).
    *   If not logged in, you will be redirected to Login/Signup.
    *   After login, you will see the Invite Acceptance screen.
    *   Click "Aceitar Convite".
5.  **Verification**:
    *   Invitee should see "Plano Família" in their profile.
    *   Owner should see the Invitee in their list.
