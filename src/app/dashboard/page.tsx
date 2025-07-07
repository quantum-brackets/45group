
import { getAllListings, getAllUsers } from '@/lib/data';
import { DashboardTables } from '@/components/dashboard/DashboardTables';
import { getSession } from '@/lib/session';

export default async function DashboardPage() {
  const listings = await getAllListings();
  const users = await getAllUsers();
  const session = await getSession();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        <DashboardTables listings={listings} users={users} session={session} />
      </div>
    </div>
  );
}
