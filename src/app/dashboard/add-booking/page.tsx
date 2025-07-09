
import { AdminBookingForm } from "@/components/dashboard/AdminBookingForm";
import { getSession } from "@/lib/session";
import { getAllListings, getAllUsers } from "@/lib/data";
import { redirect } from "next/navigation";
import { hasPermission, preloadPermissions } from "@/lib/permissions";

export default async function AddBookingPage() {
    await preloadPermissions();
    const session = await getSession();

    if (!session || !hasPermission(session, 'booking:create')) {
        const params = new URLSearchParams();
        params.set('error', 'Permission Denied');
        params.set('message', 'You do not have permission to add new bookings.');
        redirect(`/forbidden?${params.toString()}`);
    }

    const listings = await getAllListings();
    const users = await getAllUsers();
    
    return (
        <div className="container mx-auto px-4 py-8">
            <AdminBookingForm listings={listings} users={users} />
        </div>
    );
}
