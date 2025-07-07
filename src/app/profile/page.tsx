
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
    const session = await getSession();

    if (!session) {
        redirect('/login');
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <ProfileForm user={session} />
        </div>
    )
}
