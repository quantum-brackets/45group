
"use client";

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Users, List, PlusCircle, Copy, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { User, Listing } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { deleteListingAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

interface DashboardTablesProps {
  listings: Listing[];
  users: User[];
  session: User | null;
  defaultTab?: string;
}

export function DashboardTables({ listings, users, session, defaultTab }: DashboardTablesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);

  const handleDeleteListing = () => {
    if (!listingToDelete) return;

    startTransition(async () => {
      const result = await deleteListingAction(listingToDelete.id);
      if (result.success) {
        toast({
          title: "Listing Deleted",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message || "Could not delete the listing.",
          variant: "destructive",
        });
      }
      setListingToDelete(null);
    });
  };

  return (
    <>
      <Tabs defaultValue={defaultTab || 'listings'} onValueChange={(value) => router.push(`/dashboard?tab=${value}`)}>
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
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                <CardTitle>Manage Listings</CardTitle>
                <CardDescription>View, create, and manage all property listings.</CardDescription>
               </div>
               <Button asChild>
                <Link href="/dashboard/add-listing">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Listing
                </Link>
              </Button>
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
                      <TableCell className="text-right">{listing.price} {listing.currency || 'NGN'}/{listing.priceUnit}</TableCell>
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
                                  <DropdownMenuItem onClick={() => router.push(`/listing/${listing.id}`)}>View</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-listing/${listing.id}`)}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/dashboard/add-listing?duplicate=${listing.id}`)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/bookings?listingId=${listing.id}`)}>View Bookings</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onSelect={() => setListingToDelete(listing)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
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
                                          <DropdownMenuItem className="text-destructive" disabled={user.id === session?.id}>Delete User</DropdownMenuItem>
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

      <AlertDialog open={!!listingToDelete} onOpenChange={(open) => !open && setListingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive" />
              Are you sure you want to delete this listing?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the listing for <strong>{listingToDelete?.name}</strong> and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isPending}
              onClick={handleDeleteListing}
            >
              {isPending ? 'Deleting...' : 'Yes, delete listing'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
