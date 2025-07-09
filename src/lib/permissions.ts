'server-only'

import type { User, Role } from './types';
import { createSupabaseAdminClient } from './supabase';

let cachedPermissions: Record<Role, string[]> | null = null;

/**
 * Fetches permissions from the database or returns them from the cache.
 * Must be called and awaited on the server before hasPermission is used.
 */
export async function preloadPermissions() {
    if (cachedPermissions) {
        return cachedPermissions;
    }
    console.log('Fetching and caching permissions...');
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('role_permissions').select('role, permissions');

    if (error || !data) {
        console.error("Failed to load permissions from DB, will not use cache.", error);
        // In a real-world scenario, you might fall back to a local JSON file here.
        cachedPermissions = null; // Ensure cache is invalidated
        return null;
    }

    const permissionsByRole = data.reduce((acc, row) => {
        acc[row.role as Role] = row.permissions;
        return acc;
    }, {} as Record<Role, string[]>);
    
    cachedPermissions = permissionsByRole;
    return cachedPermissions;
}

/**
 * A synchronous function to check user permissions against the pre-loaded cache.
 * `preloadPermissions` must be awaited before this function is called.
 * @param user The user object, must include `id` and `role`.
 * @param permission The permission string to check, e.g., 'listing:create' or 'booking:cancel:own'.
 * @param context Optional context for ':own' checks, e.g., { ownerId: '...' }.
 * @returns True if the user has the permission, false otherwise.
 */
export function hasPermission(
    user: User | null,
    permission: string,
    context?: { ownerId?: string }
  ): boolean {
      const rolePermissions = cachedPermissions;
  
      if (!user || !user.role || !rolePermissions) {
          return false;
      }
  
      const userPermissions = rolePermissions[user.role] || [];
  
      if (userPermissions.includes('*')) {
          return true;
      }
  
      // Handle scoped permissions like 'booking:cancel:own'
      if (permission.endsWith(':own')) {
          if (userPermissions.includes(permission)) {
              // If context is provided for an existing resource, check ownership.
              if (context?.ownerId) {
                  return user.id === context.ownerId;
              }
              // If no context (like for a 'create:own' action), permission is granted.
              // The action itself must enforce setting the correct owner.
              return true;
          }
      }
  
      // Handle general permissions like 'listing:read'
      const [resource, action] = permission.split(':');
      if (userPermissions.includes(`${resource}:${action}`) || userPermissions.includes(`${resource}:*`)) {
          return true;
      }
  
      return false;
}

export const allPermissions = [
    // Dashboard
    'dashboard:read',
    // Permissions
    'permissions:read',
    'permissions:update',
    // Users
    'user:read',
    'user:create',
    'user:update',
    'user:delete',
    'user:update:own',
    // Listings
    'listing:read',
    'listing:create',
    'listing:update',
    'listing:delete',
    'listing:merge',
    // Bookings
    'booking:read',
    'booking:create',
    'booking:update',
    'booking:confirm',
    'booking:cancel',
    'booking:read:own',
    'booking:create:own',
    'booking:update:own',
    'booking:cancel:own',
    // Reviews
    'review:create:own',
    'review:approve',
    'review:delete',
] as const;

export type Permission = (typeof allPermissions)[number];
