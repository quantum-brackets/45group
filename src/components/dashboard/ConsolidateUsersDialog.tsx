
"use client";

import { useState, useMemo, useTransition } from 'react';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Merge, UserCheck, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { consolidateUsersAction } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

interface ConsolidateUsersDialogProps {
    allUsers: User[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

type DuplicateGroups = {
    [key: string]: User[];
};

// Helper function to find potential duplicate users based on name parts.
const findDuplicateUsers = (users: User[]): DuplicateGroups => {
    const nameMap: { [namePart: string]: User[] } = {};
    users.forEach(user => {
        // Split name into parts and normalize (lowercase)
        const nameParts = user.name.toLowerCase().split(/\s+/).filter(Boolean);
        nameParts.forEach(part => {
            if (!nameMap[part]) {
                nameMap[part] = [];
            }
            nameMap[part].push(user);
        });
    });

    const duplicateGroups: DuplicateGroups = {};
    Object.values(nameMap).forEach(group => {
        if (group.length > 1) {
            // Use the user IDs to group them uniquely.
            const userIds = new Set(group.map(u => u.id));
            if (userIds.size > 1) {
                const sortedIds = Array.from(userIds).sort().join(',');
                // To avoid duplicate groups, we check if this combination of users has already been added.
                if (!duplicateGroups[sortedIds]) {
                    const uniqueUsers = group.filter((user, index, self) =>
                        index === self.findIndex((t) => (t.id === user.id))
                    );
                    if (uniqueUsers.length > 1) {
                        duplicateGroups[sortedIds] = uniqueUsers;
                    }
                }
            }
        }
    });

    return duplicateGroups;
};

export function ConsolidateUsersDialog({ allUsers, isOpen, onOpenChange }: ConsolidateUsersDialogProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const duplicateGroups = useMemo(() => findDuplicateUsers(allUsers), [allUsers]);
    const groupKeys = Object.keys(duplicateGroups);

    // State to hold the primary user selection for each group.
    const [primaryUserSelections, setPrimaryUserSelections] = useState<Record<string, string>>({});
    
    // Set default primary user for each group (the first user in the list).
    useMemo(() => {
        const initialSelections: Record<string, string> = {};
        groupKeys.forEach(key => {
            initialSelections[key] = duplicateGroups[key][0].id;
        });
        setPrimaryUserSelections(initialSelections);
    }, [duplicateGroups, groupKeys]);


    const handleConsolidate = () => {
        startTransition(async () => {
            const groupKey = Object.keys(primaryUserSelections)[0];
            if (!groupKey) {
                toast({ title: 'Error', description: 'No group selected for consolidation.', variant: 'destructive' });
                return;
            }

            const primaryUserId = primaryUserSelections[groupKey];
            const userIdsToMerge = duplicateGroups[groupKey]
                .map(u => u.id)
                .filter(id => id !== primaryUserId);
            
            if(userIdsToMerge.length === 0) {
                toast({ title: 'No Action Taken', description: 'You must select different users to merge.', variant: 'default' });
                return;
            }

            const result = await consolidateUsersAction({ primaryUserId, userIdsToMerge });
            if (result.success) {
                toast({ title: 'Success!', description: result.message });
                onOpenChange(false);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Merge className="mr-2 h-4 w-4" />
                    Consolidate Users
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Consolidate Duplicate Users</DialogTitle>
                    <DialogDescription>
                        Review potential duplicate accounts. Select one user to keep as the primary account; all bookings from the other users in that group will be moved to the primary account, and the others will be deleted.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {groupKeys.length > 0 ? (
                        <ScrollArea className="h-96 pr-4">
                            <Accordion type="single" collapsible className="w-full">
                                {groupKeys.map(key => (
                                    <AccordionItem value={key} key={key}>
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4" />
                                                Group of {duplicateGroups[key].length} Potential Duplicates
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <RadioGroup
                                                value={primaryUserSelections[key]}
                                                onValueChange={(value) => setPrimaryUserSelections(prev => ({ ...prev, [key]: value }))}
                                                className="space-y-2"
                                            >
                                                {duplicateGroups[key].map(user => (
                                                    <div key={user.id} className="flex items-center space-x-2 p-2 rounded-md border has-[:checked]:bg-muted has-[:checked]:border-primary">
                                                        <RadioGroupItem value={user.id} id={`${key}-${user.id}`} />
                                                        <Label htmlFor={`${key}-${user.id}`} className="flex-grow cursor-pointer">
                                                            <div className="font-semibold">{user.name}</div>
                                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                                        </Label>
                                                    </div>
                                                ))}
                                            </RadioGroup>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No Duplicates Found</AlertTitle>
                            <AlertDescription>
                                The system did not find any potential duplicate users based on name matching.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleConsolidate} disabled={isPending || groupKeys.length === 0}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                        Merge Selected Group
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

