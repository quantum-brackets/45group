/**
 * @fileoverview This file defines the client-side logic for the Role-Based Access Control (RBAC) system.
 */
'use client';

import type { User, Role, Permission } from '@/lib/types';

/**
 * A synchronous function to check if a user has a specific permission against a provided permissions object.
 * @param permissions - The permissions object, fetched from the server.
 * @param user - The user object, must include `id` and `role`.
 * @param permission - The permission string to check, e.g., 'listing:create' or 'booking:cancel:own'.
 * @param context - Optional context for ownership checks, e.g., { ownerId: 'user-uuid' }.
 * @returns True if the user has the permission, false otherwise.
 */
export function hasPermission(
    permissions: Record<Role, Permission[]> | null,
    user: User | null,
    permission: string,
    context?: { ownerId?: string }
  ): boolean {
      if (!user || !permissions) {
          return false;
      }
      
      // Super-admin override: The 'admin' role has all permissions. This is a hardcoded rule.
      if (user.role === 'admin') {
          return true;
      }
  
      const userPermissions = permissions[user.role] || [];
  
      // Handle scoped permissions like 'booking:cancel:own'
      if (permission.endsWith(':own')) {
          if (userPermissions.includes(permission as Permission)) {
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
      if (userPermissions.includes(`${resource}:${action}` as Permission) || userPermissions.includes(`${resource}:*` as Permission)) {
          return true;
      }
  
      // If no match is found, deny permission.
      return false;
}
