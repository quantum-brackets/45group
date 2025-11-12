
"use client";

import { useState, useMemo, useTransition, useEffect } from 'react';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Merge, UserCheck, Users } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { consolidateMultipleUsersAction } from '@/lib/actions';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface ConsolidateUsersDialogProps {
    allUsers: User[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

type DuplicateGroups = {
    [key: string]: User[];
};

// Helper function to find potential duplicate users using a graph-based clustering approach.
// This ensures that groups are properly normalized (e.g., A-B and B-C become A-B-C).
const findDuplicateUsers = (users: User[]): DuplicateGroups => {
    if (users.length < 2) return {};

    const userTokens: { id: string, tokens: string[] }[] = users.map(user => ({
        id: user.id,
        tokens: user.name.toLowerCase().split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length) // Sort by length descending
    }));

    // Build an adjacency list for the graph where an edge represents a potential duplicate pair.
    const adj: Record<string, string[]> = {};
    userTokens.forEach(u => adj[u.id] = []);

    for (let i = 0; i < userTokens.length; i++) {
        for (let j = i + 1; j < userTokens.length; j++) {
            const userA = userTokens[i];
            const userB = userTokens[j];

            let commonTokens = 0;
            const seenTokens = new Set<string>();

            // Use substring matching instead of exact matching.
            for (const tokenA of userA.tokens) {
                for (const tokenB of userB.tokens) {
                    if (seenTokens.has(tokenA) || seenTokens.has(tokenB)) continue;

                    if (tokenA.includes(tokenB) || tokenB.includes(tokenA)) {
                        commonTokens++;
                        seenTokens.add(tokenA);
                        seenTokens.add(tokenB);
                        break; // Move to the next tokenA once a match is found
                    }
                }
            }
            
            // If they share 2 or more name parts, they are connected in the graph.
            if (commonTokens >= 2) {
                adj[userA.id].push(userB.id);
                adj[userB.id].push(userA.id);
            }
        }
    }

    const clusters: User[][] = [];
    const visited = new Set<string>();

    // Traverse the graph to find all connected components (the clusters of duplicates).
    userTokens.forEach(user => {
        if (!visited.has(user.id)) {
            const currentCluster: User[] = [];
            const stack = [user.id];
            visited.add(user.id);

            while (stack.length > 0) {
                const uId = stack.pop()!;
                const fullUser = users.find(u => u.id === uId);
                if (fullUser) {
                    currentCluster.push(fullUser);
                }

                (adj[uId] || []).forEach(vId => {
                    if (!visited.has(vId)) {
                        visited.add(vId);
                        stack.push(vId);
                    }
                });
            }

            // Only consider clusters with more than one user as a duplicate group.
            if (currentCluster.length > 1) {
                clusters.push(currentCluster);
            }
        }
    });

    // Convert the clusters into the required DuplicateGroups format.
    const duplicateGroups: DuplicateGroups = {};
    clusters.forEach(cluster => {
        // Sort by name to keep the order consistent.
        cluster.sort((a, b) => a.name.localeCompare(b.name));
        const groupKey = cluster.map(u => u.id).sort().join(',');
        duplicateGroups[groupKey] = cluster;
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
    const [selectedGroups, setSelectedGroups] = useState<Record<string, boolean>>({});

    // Set default primary user for each group (the first user in the list).
    useEffect(() => {
        const initialSelections: Record<string, string> = {};
        groupKeys.forEach(key => {
            if (duplicateGroups[key] && duplicateGroups[key].length > 0) {
              initialSelections[key] = duplicateGroups[key][0].id;
            }
        });

        // Add a check to prevent re-rendering if the selections haven't changed.
        if (JSON.stringify(Object.keys(initialSelections)) !== JSON.stringify(Object.keys(primaryUserSelections))) {
            setPrimaryUserSelections(initialSelections);
        }
    }, [duplicateGroups, groupKeys, primaryUserSelections]);


    const handleConsolidate = () => {
        startTransition(async () => {
            const groupsToMerge = Object.keys(selectedGroups)
                .filter(key => selectedGroups[key])
                .map(key => {
                    const primaryUserId = primaryUserSelections[key];
                    const userIdsToMerge = duplicateGroups[key]
                        .map(u => u.id)
                        .filter(id => id !== primaryUserId);
                    return { primaryUserId, userIdsToMerge };
                })
                .filter(group => group.userIdsToMerge.length > 0);

            if (groupsToMerge.length === 0) {
                toast({ title: 'No Action Taken', description: 'Select at least one group to merge, and ensure a different primary user is chosen.', variant: 'default' });
                return;
            }

            const result = await consolidateMultipleUsersAction({ groups: groupsToMerge });
            if (result.success) {
                toast({ title: 'Success!', description: result.message });
                onOpenChange(false);
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        });
    };

    const numSelectedGroups = Object.values(selectedGroups).filter(Boolean).length;

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
                        Review potential duplicate accounts (2+ matching name parts). Select groups to merge, choose a primary account for each, then consolidate. All bookings from other users in a group will be moved to the primary account, and the others will be deleted.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {groupKeys.length > 0 ? (
                        <ScrollArea className="h-96 pr-4">
                            <Accordion type="multiple" className="w-full">
                                {groupKeys.map(key => (
                                    <AccordionItem value={key} key={key}>
                                        <div className="flex items-center gap-2 pr-4">
                                            <Checkbox
                                                id={`select-${key}`}
                                                checked={selectedGroups[key] || false}
                                                onCheckedChange={(checked) => {
                                                    setSelectedGroups(prev => ({...prev, [key]: !!checked}))
                                                }}
                                                className="ml-1"
                                            />
                                            <AccordionTrigger className="flex-1">
                                                <Label htmlFor={`select-${key}`} className="flex items-center gap-2 cursor-pointer">
                                                    <Users className="h-4 w-4" />
                                                    Group of {duplicateGroups[key].length} Potential Duplicates
                                                </Label>
                                            </AccordionTrigger>
                                        </div>
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
                    <Button onClick={handleConsolidate} disabled={isPending || numSelectedGroups === 0}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                        Merge {numSelectedGroups > 0 ? `${numSelectedGroups} Selected Group(s)` : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
