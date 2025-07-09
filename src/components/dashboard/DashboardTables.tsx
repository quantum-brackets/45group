
"use client";

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Users, List, PlusCircle, Trash2, AlertCircle, Warehouse, Merge, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { User, Listing } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteListingAction, toggleUserStatusAction, bulkDeleteListingsAction, mergeListingsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface DashboardTablesProps {
  listings: Listing[];
  users: User[];
  session: User | null;
  defaultTab?: string;
}

const UserStatusSwitch = ({ user, isCurrentUser, disabled }: { user: User; isCurrentUser: boolean, disabled: boolean }) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggle = (newStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleUserStatusAction({
        userId: user.id,
        status: newStatus ? 'active' : 'disabled',
      });
      if (!result.success) {
        toast({
          title: "Update Failed",
          description: result.message,
          variant: "destructive",
        });
      } else {
        toast({
            title: "Status Updated",
            description: result.message,
        });
      }
    });
  };

  return (
    <Switch
      checked={user.status === 'active'}
      onCheckedChange={handleToggle}
      disabled={disabled || isCurrentUser || isPending}
      aria-label={`Toggle user status for ${user.name}`}
    />
  );
};

export function DashboardTables({ listings, users, session, defaultTab }: DashboardTablesProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isBulkActionPending, startBulkActionTransition] = useTransition();

  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [primaryListingId, setPrimaryListingId] = useState<string>('');
  
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');

  const filteredUsers = users.filter(user => {
    if (!userSearch) return true;
    const searchTerm = userSearch.toLowerCase();
    
    // Search across all string values of the user object
    return Object.values(user).some(value => {
      return typeof value === 'string' && value.toLowerCase().includes(searchTerm);
    });
  });

  const filteredListings = listings.filter(listing => {
    if (!listingSearch) return true;
    const searchTerm = listingSearch.toLowerCase();
    return JSON.stringify(listing).toLowerCase().includes(searchTerm);
  });

  const selectedIds = Object.keys(selectedRowIds).filter((id) => selectedRowIds[id]);
  const selectedListings = listings.filter(l => selectedIds.includes(l.id));

  const handleSelectAll = (checked: boolean) => {
    const newSelected = { ...selectedRowIds };
    filteredListings.forEach(l => {
      if (checked) {
        newSelected[l.id] = true;
      } else {
        delete newSelected[l.id];
      }
    });
    setSelectedRowIds(newSelected);
  };

  const handleRowSelect = (id: string, checked: boolean) => {
      setSelectedRowIds(prev => ({ ...prev, [id]: checked }));
  };

  const clearSelection = () => setSelectedRowIds({});

  const handleOpenMergeDialog = () => {
      if (selectedIds.length > 0) {
          setPrimaryListingId(selectedIds[0]);
          setIsMergeDialogOpen(true);
      }
  };

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

  const handleBulkDelete = () => {
    startBulkActionTransition(async () => {
        const result = await bulkDeleteListingsAction({ listingIds: selectedIds });
        if(result.success) {
            toast({ title: "Success", description: result.message });
            clearSelection();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsDeleteDialogOpen(false);
    });
  }

  const handleMerge = () => {
    const listingIdsToMerge = selectedIds.filter(id => id !== primaryListingId);
    if (!primaryListingId || listingIdsToMerge.length === 0) {
        toast({ title: "Merge Error", description: "You must select a primary listing and at least one other listing to merge.", variant: "destructive" });
        return;
    }
    startBulkActionTransition(async () => {
        const result = await mergeListingsAction({ primaryListingId, listingIdsToMerge });
        if(result.success) {
            toast({ title: "Success", description: result.message });
            clearSelection();
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setIsMergeDialogOpen(false);
    });
  }

  const isAdmin = session?.role === 'admin';
  const isStaff = session?.role === 'staff';

  const allFilteredSelected = filteredListings.length > 0 && filteredListings.every(l => selectedRowIds[l.id]);
  const someFilteredSelected = filteredListings.some(l => selectedRowIds[l.id]) && !allFilteredSelected;

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
            <CardHeader className="flex flex-row items-center justify-between gap-4">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter listings..."
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    className="w-full max-w-sm pl-10"
                  />
                </div>
               {isAdmin && (
                  <Button asChild>
                    <Link href="/dashboard/add-listing">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Listing
                    </Link>
                  </Button>
               )}
            </CardHeader>
            <CardContent>
              {isAdmin && selectedIds.length > 0 && (
                <div className="bg-muted p-2 rounded-md mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="icon" onClick={clearSelection}><X className="h-4 w-4" /><span className="sr-only">Clear selection</span></Button>
                      <span className="text-sm font-medium">{selectedIds.length} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleOpenMergeDialog} disabled={selectedIds.length < 2 || isBulkActionPending}>
                            <Merge className="mr-2 h-4 w-4" />
                            Merge
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)} disabled={isBulkActionPending}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                        <TableHead className="w-[40px]">
                            <Checkbox
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                checked={someFilteredSelected ? 'indeterminate' : allFilteredSelected}
                                aria-label="Select all listings"
                            />
                        </TableHead>
                    )}
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListings.map((listing) => (
                    <TableRow key={listing.id} data-state={selectedRowIds[listing.id] ? 'selected' : undefined}>
                      {isAdmin && (
                        <TableCell>
                            <Checkbox
                                checked={!!selectedRowIds[listing.id]}
                                onCheckedChange={(checked) => handleRowSelect(listing.id, !!checked)}
                                aria-label={`Select listing ${listing.name}`}
                            />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{listing.name}</TableCell>
                      <TableCell>{listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}</TableCell>
                      <TableCell className="hidden md:table-cell">{listing.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                            <span>{listing.inventoryCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{new Intl.NumberFormat().format(listing.price)} {listing.currency}/{listing.price_unit}</TableCell>
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
                                  <DropdownMenuItem onClick={() => router.push(`/listing/${listing.id}`)}>Details</DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-listing/${listing.id}`)}>Edit</DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem onClick={() => router.push(`/bookings?listingId=${listing.id}`)}>Bookings</DropdownMenuItem>
                                  {isAdmin && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onSelect={() => router.push(`/dashboard/add-listing?duplicate=${listing.id}`)}>Duplicate</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive" onSelect={() => setListingToDelete(listing)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
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
            <CardHeader className="flex flex-row items-center justify-between gap-4">
               <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter users by name, email, role..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full max-w-sm pl-10"
                  />
                </div>
              {isAdmin && (
                <Button asChild>
                  <Link href="/dashboard/add-user">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden sm:table-cell">Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.name}</TableCell>
                              <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                              <TableCell>
                                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                      {user.role}
                                  </Badge>
                              </TableCell>
                              <TableCell>
                                <UserStatusSwitch user={user} isCurrentUser={user.id === session?.id} disabled={!isAdmin} />
                              </TableCell>
                              <TableCell className="text-right">
                                  {(isAdmin || isStaff) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isAdmin && user.id === session?.id}>
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/edit-user/${user.id}`)}>
                                                {isAdmin ? 'Edit User' : 'View User'}
                                            </DropdownMenuItem>
                                            {isAdmin && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-destructive" disabled={user.id === session?.id}>Delete User</DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Single Delete Dialog */}
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

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-destructive" />
              Delete {selectedIds.length} listing(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} listing(s) and all their associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkActionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isBulkActionPending}
              onClick={handleBulkDelete}
            >
              {isBulkActionPending ? 'Deleting...' : 'Yes, delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Dialog */}
      <Dialog open={isMergeDialogOpen} onOpenChange={setIsMergeDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Merge {selectedIds.length} Listings</DialogTitle>
                <DialogDescription>
                    Select a primary listing to merge the others into. Data like images, features, reviews, and inventory will be combined. Other details (name, price, etc.) will be taken from the primary listing. This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <RadioGroup value={primaryListingId} onValueChange={setPrimaryListingId} className="space-y-2 max-h-60 overflow-y-auto p-1">
                {selectedListings.map((listing) => (
                    <Label key={listing.id} htmlFor={listing.id} className="flex items-center gap-4 p-3 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all cursor-pointer">
                        <RadioGroupItem value={listing.id} id={listing.id} />
                        <div>
                            <p className="font-semibold">{listing.name}</p>
                            <p className="text-sm text-muted-foreground">{listing.location}</p>
                        </div>
                    </Label>
                ))}
            </RadioGroup>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsMergeDialogOpen(false)} disabled={isBulkActionPending}>Cancel</Button>
                <Button onClick={handleMerge} disabled={isBulkActionPending || !primaryListingId}>
                    {isBulkActionPending ? "Merging..." : `Merge into "${selectedListings.find(l => l.id === primaryListingId)?.name}"`}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
