/**
 * @fileoverview This file defines the Role-Based Access Control (RBAC) system.
 * It includes functions for loading permissions and checking if a user has
 * a specific permission.
 */
import type { User, Role } from './types';
import { createSupabaseAdminClient } from './supabase';

// A server-side cache for permissions to avoid repeated database calls.
let cachedPermissions: Record<Role, string[]> | null = null;

/**
 * Fetches all role permissions from the database and stores them in the server-side cache.
 * This function MUST be called and awaited on the server (e.g., in a layout or middleware)
 * before `hasPermission` is used, to ensure the cache is populated.
 * @returns The cached permissions object or null if fetching fails.
 */
export async function preloadPermissions() {
    if (cachedPermissions) {
        // Return from cache if already populated.
        return cachedPermissions;
    }
    console.log('Fetching and caching permissions...');
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('role_permissions').select('role, data');

    if (error || !data) {
        console.error("Failed to load permissions from DB, will not use cache.", error);
        // In a real-world scenario, you might fall back to a local JSON file here as a failsafe.
        cachedPermissions = null; // Ensure cache is invalidated on error.
        return null;
    }

    // Transform the flat array from the DB into a structured object for easy lookup.
    const permissionsByRole = data.reduce((acc, row) => {
        if (row.data && Array.isArray(row.data.permissions)) {
            acc[row.role as Role] = row.data.permissions;
        }
        return acc;
    }, {} as Record<Role, string[]>);
    
    cachedPermissions = permissionsByRole;
    return cachedPermissions;
}

/**
 * A synchronous function to check if a user has a specific permission against the pre-loaded cache.
 * `preloadPermissions` must be awaited before this function is called.
 * @param user The user object, must include `id` and `role`.
 * @param permission The permission string to check, e.g., 'listing:create' or 'booking:cancel:own'.
 * @param context Optional context for ownership checks, e.g., { ownerId: 'user-uuid' }.
 * @returns True if the user has the permission, false otherwise.
 */
export function hasPermission(
    user: User | null,
    permission: string,
    context?: { ownerId?: string }
  ): boolean {
      if (!user) {
          return false;
      }
      
      // Super-admin override: The 'admin' role has all permissions. This is a hardcoded rule.
      if (user.role === 'admin') {
          return true;
      }

      const rolePermissions = cachedPermissions;
  
      if (!user.role || !rolePermissions) {
          console.error("Permissions not loaded. Call preloadPermissions() on the server.");
          // Fail safely if permissions are not loaded.
          return false;
      }
  
      const userPermissions = rolePermissions[user.role] || [];
  
      // Handle scoped permissions like 'booking:cancel:own'
      if (permission.endsWith(':own')) {
          if (userPermissions.includes(permission)) {
              // If context is provided for an existing resource, check if the user is the owner.
              if (context?.ownerId) {
                  return user.id === context.ownerId;
              }
              // If no context is provided (e.g., for a 'create:own' action), permission is granted.
              // The server action itself must then enforce setting the correct owner ID.
              return true;
          }
      }
  
      // Handle general permissions like 'listing:read'.
      // This also supports wildcards, e.g., 'listing:*'.
      const [resource, action] = permission.split(':');
      if (userPermissions.includes(`${resource}:${action}`) || userPermissions.includes(`${resource}:*`)) {
          return true;
      }
  
      // If no match is found, deny permission.
      return false;
}

// A definitive list of all possible permissions in the system.
// This is used for type safety and for UI components that display permissions.
export const allPermissions = [
    // Dashboard
    'dashboard:read',
    // Permissions Management
    'permissions:read',
    'permissions:update',
    // User Management
    'user:read',
    'user:create',
    'user:update',
    'user:delete',
    'user:update:own', // User can update their own profile
    // Listing Management
    'listing:read',
    'listing:create',
    'listing:update',
    'listing:delete',
    // Booking Management
    'booking:read', // Can read all bookings
    'booking:create', // Can create bookings for others
    'booking:update', // Can update any booking
    'booking:confirm', // Can confirm a booking
    'booking:cancel', // Can cancel any booking
    'booking:read:own', // Can read their own bookings
    'booking:create:own', // Can create a booking for themselves
    'booking:update:own', // Can update their own booking
    'booking:cancel:own', // Can cancel their own booking
    // Review Management
    'review:create:own', // Can create a review for a listing
    'review:approve', // Can approve a pending review
    'review:delete', // Can delete any review
] as const;

// TypeScript type generated from the permissions array.
export type Permission = (typeof allPermissions)[number];
