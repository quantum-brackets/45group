# **App Name**: 45 Booking

This document outlines the features, style guidelines, and architectural decisions for the 45 Booking application. It serves as a living specification, updated as the project evolves.

## Implemented Features

### 1. User & Authentication Features
- **User Authentication**: Secure login/logout functionality. Session management is handled via secure, HTTP-only cookies.
- **User Signup**: Users can create a 'guest' account.
- **Password Reset**: Users can request a password reset via email. A secure, time-limited token is generated and sent to their email address.
- **Guest Checkout**: New users can make a booking by providing a name and email, which automatically creates a 'provisional' account for them to manage their booking. They can later "claim" this account by completing the signup process.
- **Profile Management**: Logged-in users can view and update their profile information, including name, email, phone number, and password.

### 2. Listing & Search Features
- **Homepage**: Displays service categories (Hotel, Events, Restaurant) with sample images.
- **Listing Search & Filtering**: A dedicated search page allows users to find listings with filters for:
  - Location (text search)
  - Listing Type (Hotel, Events, Restaurant)
  - Number of Guests
  - Date Range (check-in/check-out)
- **Search Results**: Listings are displayed in a grid format, sorted by location, then type, then name.
- **Listing Details Page**:
  - Displays comprehensive information: description, image carousel, features, location, and average rating.
  - Users can read reviews left by other customers.
  - A prominent booking form allows users to request a reservation.

### 3. Booking & Reservation Features
- **Booking Form**:
  - Real-time availability checking for selected dates.
  - Users can select the number of guests and the number of units to book.
  - The number of bookable units is dynamically limited by availability.
  - The total price is calculated and displayed in real-time.
- **Booking Workflow**:
  - All new bookings are created with a `Pending` status.
  - Users are informed about payment policies directly on the form.
  - The booking confirmation is handled by an admin/staff member.
- **Booking Management (for Users)**:
  - Users can view a list of all their past and upcoming bookings.
  - Each booking has a detailed view showing all information, including status.
  - Users can cancel their own bookings.
- **Booking History (Audit Trail)**: Each booking maintains a complete history of actions (creation, updates, confirmation, cancellation), visible to admins and staff.

### 4. Review Management
- **Write Reviews**: Logged-in users can write and edit reviews for listings.
- **Review Moderation**: All submitted reviews are set to `Pending` and must be approved by an administrator before they become publicly visible and contribute to the listing's average rating.

### 5. Staff & Admin Dashboard
- **Role-Based Access Control (RBAC)**: The application distinguishes between `guest`, `staff`, and `admin` roles, with specific permissions for each.
- **Dashboard Overview**: A central dashboard for staff and admins with tabs for managing listings and users.
- **Listing Management**:
  - Admins can create, view, update, and delete listings.
  - Admins can manage a listing's inventory by adding, renaming, or deleting individual bookable units (e.g., "Room 101", "Conference Hall A").
  - Admins can duplicate existing listings to speed up creation.
- **User Management**:
  - Admins and staff can view a list of all users.
  - Admins can edit any user's details, role, and status. Staff can only view user details.
  - Admins and staff can create new user accounts.
  - Admins can delete users (provided they have no active bookings).
- **Booking Management (for Staff/Admins)**:
  - Staff and admins can view all bookings across the system.
  - They can confirm pending bookings or cancel any booking.
  - They can book on behalf of existing customers.
- **Financial Management**:
  - For any booking, admins/staff can add additional charges (bills) or record payments made by the guest.
  - A billing summary shows the total bill, total payments, and the outstanding balance.
- **Review Moderation**: Admins can approve or delete pending user reviews directly from the listing detail page.

### 6. Email Notifications
- **Transactional Emails**: The application sends emails for key events using the Resend API.
- **Welcome Email**: Sent to new users upon successful signup.
- **Password Reset**: Sent when a user requests to reset their password.
- **Booking Request**: Sent to a user when they submit a new booking request.
- **Booking Confirmation**: Sent to a user when an admin confirms their booking.

## Style Guidelines:

- **Primary Color**: `#d34c23` (HSL: `15 71.3% 48.4%`) - Evokes trust and stability.
- **Background Color**: `#F4F7FA` (HSL: `210 25% 98%`) - A clean and calming background.
- **Accent Color**: `#2aa147` (HSL: `138 59.2% 39.8%`) - Highlights calls to action and important information.
- **Font**: 'Inter' (sans-serif) for body and headlines, ensuring clear, modern readability.
- **UI Principles**:
  - Uses simple, recognizable icons (`lucide-react`) to represent actions and types.
  - Employs a clean and intuitive grid-based layout.
  - Uses subtle animations for user feedback and engagement.

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

-   **Permissions Storage**: Roles (`admin`, `staff`, `guest`) and their associated permissions are stored in the `role_permissions` table.
-   **Server-Side Enforcement**: Permissions are fetched and cached on the server at the start of a request (`preloadPermissions`). Checks are performed synchronously using `hasPermission(user, 'permission:scope')`. This ensures security logic is handled on the server and is not bypassable from the client.
