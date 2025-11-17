
import { getAllListings, getAllUsers } from '@/lib/data';
import { DashboardTables } from '@/components/dashboard/DashboardTables';
import { getSession } from '@/lib/session';

interface DashboardPageProps {
  searchParams?: {
    tab?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const listings = await getAllListings();
  const users = await getAllUsers();
  const session = await getSession();
  const { tab } = (await searchParams) || {};
  const defaultTab = tab === 'users' ? 'users' : 'listings';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8">
        <DashboardTables listings={listings} users={users} session={session} defaultTab={defaultTab} />
      </div>
    </div>
  );
}
