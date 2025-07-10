# **App Name**: 45 Booking

## Core Features:

- Browse Listings: Browse available hotel rooms, event centers, and restaurants in the area.
- View Details: View detailed information, photos, and reviews for each listing.
- Check Availability: Check availability for specific dates and times.
- Number of Guests: Add the number of guests who'll attend the reservation.
- AI Recommendations: An AI powered tool that will provide tailored recommendations based on user preferences and availability.
- Confirmation Messages: Display confirmation messages.
- Staff Management: Allow staff to manage listings and bookings.
- Filters: Users can search for places using filters like type of place, city location, number of guests, date and other relevant features

## Style Guidelines:

- Primary color: #d34c23 to evoke trust and stability.
- Background color: #F4F7FA for a clean and calming background.
- Accent color: #2aa147 to highlight calls to action and important information.
- Body and headline font: 'Inter' (sans-serif) for clear, modern readability.
- Use simple, recognizable icons to represent different types of bookings.
- Employ a clean and intuitive grid-based layout to facilitate easy browsing and booking.
- Use subtle animations to provide feedback on user interactions and enhance engagement.

## Architectural Decisions

This section documents the key architectural patterns and decisions that have been implemented to ensure the application is scalable, maintainable, and resilient.

### 1. JSONB-First Database Structure

To provide maximum flexibility and reduce schema fragility, the application employs a hybrid database model using PostgreSQL's JSONB type within Supabase.

-   **Core Principle**: Most entity data is stored within a single `data` JSONB column. This includes attributes that are not frequently used for filtering or joining, such as descriptions, names, lists of features, image URLs, and user profile details.
-   **Indexed Columns**: Only fields critical for performance and data integrity remain as top-level relational columns. These include:
    -   Primary Keys (`id`)
    -   Foreign Keys (`listing_id`, `user_id`)
    -   Frequently queried fields used for filtering (`type`, `status`, `email`, `location`).
-   **Benefits**: This approach allows for adding new attributes to entities (like a new user preference or listing feature) without requiring a database schema migration. It simplifies the data model and makes the application more adaptable to future requirements.

### 2. Application-Centric Business Logic

All business logic is explicitly implemented within the application's server-side code, primarily in Server Actions (`src/lib/actions.ts`).

-   **No Database Functions**: The application does not use custom PL/pgSQL database functions or stored procedures (`.rpc()` calls).
-   **Centralized Logic**: Complex operations such as checking booking availability, calculating average review ratings, and managing inventory are handled in TypeScript.
-   **Benefits**: This makes the application's behavior easier to understand, debug, and version control. It decouples the application from the database, allowing either to be updated more independently.

### 3. Role-Based Access Control (RBAC) System

The application uses a flexible, database-driven RBAC system.

-   **Permissions Storage**: Roles (`admin`, `staff`, `guest`) and their associated permissions are stored in the `role_permissions` table, following the same JSONB-first pattern (permissions are stored in a list within the `data` column).
-   **Server-Side Enforcement**: Permissions are fetched and cached on the server at the start of a request (`preloadPermissions`). Checks are performed synchronously using `hasPermission(user, 'permission:scope')`. This ensures security logic is handled on the server and is not bypassable from the client.
