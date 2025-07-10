/**
 * @fileoverview This file defines the server-side logic for the Role-Based Access Control (RBAC) system.
 */
import type { Role } from '../types';
import { createSupabaseAdminClient } from '../supabase-server';
import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Fetches all role permissions from the database.
 * This function should be called and awaited on the server (e.g., in a layout or page)
 * before its results are used, ensuring fresh data for each request.
 * @returns A promise that resolves to the permissions object or null if fetching fails.
 */
export async function preloadPermissions(): Promise<Record<Role, string[]> | null> {
    noStore(); // Opt-out of caching to ensure permissions are fresh for each request.
    
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('role_permissions').select('role, data');

    if (error || !data) {
        console.error("Failed to load permissions from DB.", error);
        return null; // Return null on error.
    }

    // Transform the flat array from the DB into a structured object for easy lookup.
    const permissionsByRole = data.reduce((acc, row) => {
        if (row.data && Array.isArray(row.data.permissions)) {
            acc[row.role as Role] = row.data.permissions;
        }
        return acc;
    }, {} as Record<Role, string[]>);
    
    return permissionsByRole;
}
