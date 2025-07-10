# 45 Booking - Development Guide

Welcome to the 45 Booking project! This document serves as a guide for developers to understand the project's architecture, technology stack, and operational procedures.

## 1. Project Overview

**45 Booking** is a comprehensive hospitality management application. It allows users to search for and book hotels, event centers, and restaurants. The platform also includes a full-featured administrative dashboard for staff and administrators to manage listings, users, bookings, and reviews.

Key features include:
- Secure user authentication, profile management, and password reset via email.
- Guest checkout with provisional account creation.
- Automated email notifications for account creation and booking status changes.
- Advanced search and filtering for listings.
- A complete booking and reservation workflow with status management.
- Role-Based Access Control (RBAC) for `guest`, `staff`, and `admin` roles.
- A dashboard for comprehensive management of all application data.

## 2. Tech Stack

The application is built on a modern, server-centric, and type-safe technology stack.

- **Framework**: **Next.js** (using the App Router). We leverage Server Components by default to minimize client-side JavaScript and improve performance.
- **Language**: **TypeScript**.
- **UI Components**: **ShadCN UI**. This is not a traditional component library but a collection of reusable components that can be copied into the project and customized. The base components are from Radix UI.
- **Styling**: **Tailwind CSS** for utility-first styling. The theme is configured in `src/app/globals.css`.
- **Database**: **Supabase** (PostgreSQL). The application uses Supabase for its database and server-side client libraries.
- **Authentication**: **Custom Session Management**. Authentication is handled via secure, HTTP-only cookies managed by server-side code in `src/lib/session.ts`. This provides a secure and robust session mechanism.
- **Transactional Emails**: **Resend** is used to send all transactional emails (e.g., welcome, password reset, booking confirmations). Email templates are built with React Email.
- **Data Validation**: **Zod** is used for schema declaration and validation in forms and server actions, ensuring data integrity.
- **Forms**: **React Hook Form** for managing form state and validation.

## 3. Project Structure

The codebase is organized to separate concerns and improve maintainability.

- `src/app/`: Contains all the pages and routes for the application, following the Next.js App Router conventions.
- `src/components/`: Contains all reusable React components, organized by feature.
  - `src/components/ui/`: Contains the base UI components from ShadCN UI.
  - `src/components/emails/`: Contains React Email templates.
- `src/lib/`: Houses the core business logic, data fetching, and utility functions.
  - `actions.ts`: Contains all Server Actions, which handle data mutations (create, update, delete).
  - `auth.ts`: Contains Server Actions specifically for login, signup, and password reset.
  - `data.ts`: Contains all server-side data fetching functions.
  - `email.ts`: The centralized service for sending emails via Resend.
  - `permissions.ts`: Defines the Role-Based Access Control (RBAC) system.
  - `session.ts`: Manages user session creation and retrieval using cookies.
  - `supabase.ts`: Configures the Supabase client instances.
- `public/`: For static assets like images and icons.
- `BLUEPRINT.md`: The living specification document outlining all application features and architectural decisions.

## 4. Getting Started (Local Development)

To run this project locally, you will need to set up a Supabase project and configure your environment variables.

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Setup Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Supabase:**
    - Go to [Supabase](https://supabase.com/) and create a new project.
    - Use the SQL scripts located in the `supabase/` directory of this project to set up your database schema and initial data.
    - In your Supabase project settings, go to the "API" section.

4.  **Configure Environment Variables:**
    - Create a new file named `.env.local` in the root of the project.
    - Copy the contents of `.env.example` into `.env.local`.
    - Fill in the values using the credentials from your Supabase API settings and your Resend account:

    ```env
    # Found in your Supabase project's API settings
    NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
    NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
    SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

    # Get from https://resend.com
    RESEND_API_KEY="your-resend-api-key"
    # Must be a domain you have verified in Resend
    RESEND_FROM_EMAIL="noreply@yourdomain.com"
    # The public URL of your deployed application
    NEXT_PUBLIC_BASE_URL="http://localhost:9002"
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

## 5. Architectural Decisions

- **JSONB-First Database**: Most entity data (e.g., listing descriptions, user profiles) is stored in a `data` JSONB column in Supabase. This provides flexibility and avoids frequent schema migrations. Only fields critical for filtering and relations are top-level columns.
- **Application-Centric Logic**: All business logic, including complex validation and data manipulation, resides in TypeScript within Server Actions (`src/lib/actions.ts`). The database is treated purely as a data store, with no custom functions or stored procedures.

## 6. Deployment

This project is configured for continuous deployment.

- **Trigger**: Deployments are automatically initiated when a new commit is pushed to the `master` branch of the repository.
- **Platform**: The application is intended to be deployed on a platform that supports Next.js, such as Vercel or Firebase App Hosting. Ensure that the environment variables listed above are configured in the deployment environment's settings.
