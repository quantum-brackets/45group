
import { getAllListings } from '@/lib/data';
import { DashboardTables } from '@/components/admin/DashboardTables';

export default async function AdminPage() {
  const listings = await getAllListings();

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-headline font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">Manage your listings.</p>
      </header>
      <div className="grid gap-8">
        <DashboardTables listings={listings} />
      </div>
    </div>
  );
}
