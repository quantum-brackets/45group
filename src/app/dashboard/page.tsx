
import { getAllListings, getAllUsers } from '@/lib/data';
import { DashboardTables } from '@/components/dashboard/DashboardTables';

export default async function DashboardPage() {
  const listings = await getAllListings();
  const users = await getAllUsers();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">Manage your listings and users.</p>
      </header>
      <div className="grid gap-8">
        <DashboardTables listings={listings} users={users} />
      </div>
    </div>
  );
}
