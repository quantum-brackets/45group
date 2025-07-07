
import { getAllListings, getAllUsers } from '@/lib/data';
import { DashboardTables } from '@/components/dashboard/DashboardTables';

export default async function DashboardPage() {
  const listings = await getAllListings();
  const users = await getAllUsers();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        <DashboardTables listings={listings} users={users} />
      </div>
    </div>
  );
}
