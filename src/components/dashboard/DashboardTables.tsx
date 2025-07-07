
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Users, List, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { User, Listing } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { useTransition } from 'react';
import { updateUserRoleAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface DashboardTablesProps {
  listings: Listing[];
  users: User[];
  session: User | null;
}

export function DashboardTables({ listings, users, session }: DashboardTablesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleRoleChange = (userId: string, role: 'admin' | 'guest' | 'staff') => {
    startTransition(async () => {
      const result = await updateUserRoleAction({ userId, role });
      if (result.success) {
        toast({
          title: "Success",
          description: result.success,
        });
      } else {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Tabs defaultValue="listings">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="listings">
            <List className="mr-2" />
            Listings
        </TabsTrigger>
        <TabsTrigger value="users">
            <Users className="mr-2" />
            Users
        </TabsTrigger>
      </TabsList>
      <TabsContent value="listings">
        <Card>
          <CardHeader>
            <CardTitle>Manage Listings</CardTitle>
            <CardDescription>View and manage all property listings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.name}</TableCell>
                    <TableCell>{listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}</TableCell>
                    <TableCell>{listing.location}</TableCell>
                    <TableCell className="text-right">${listing.price}/{listing.priceUnit}</TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-listing/${listing.id}`)}>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/bookings?listingId=${listing.id}`)}>View Bookings</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="users">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Manage Users</CardTitle>
              <CardDescription>View, create, and manage user accounts.</CardDescription>
            </div>
            <Button asChild>
              <Link href="/dashboard/add-user">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add User
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.role}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" disabled={user.id === session?.id}>
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-user/${user.id}`)}>
                                            Edit User
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                                        {user.role !== 'admin' && (
                                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')} disabled={isPending}>
                                                Make Admin
                                            </DropdownMenuItem>
                                        )}
                                        {user.role !== 'staff' && (
                                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'staff')} disabled={isPending}>
                                                Make Staff
                                            </DropdownMenuItem>
                                        )}
                                        {user.role !== 'guest' && (
                                            <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'guest')} disabled={isPending}>
                                                Make Guest
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" disabled={isPending}>Delete User</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
