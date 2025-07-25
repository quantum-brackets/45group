"use client";

import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { Listing, User } from '@/lib/types';
import { Combobox } from '../ui/combobox';
import { createWalkInReservationAction } from '@/lib/actions';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, XCircle } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';

interface AddReservationDialogProps {
    children: React.ReactNode;
    allListings: Listing[];
    allUsers: User[];
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const reservationSchema = z.object({
    listingId: z.string().min(1, "Please select a listing."),
    userId: z.string().optional(),
    newCustomerName: z.string().optional(),
    guests: z.coerce.number().int().min(1, "At least one guest is required."),
    units: z.coerce.number().int().min(1, "At least one unit is required."),
    bills: z.array(z.object({
        description: z.string().min(1, "Description cannot be empty."),
        amount: z.coerce.number().positive("Amount must be a positive number."),
        paid: z.boolean(),
    })).optional(),
}).superRefine((data, ctx) => {
    if (!data.userId && !data.newCustomerName) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['newCustomerName'],
            message: 'Please select an existing customer or enter a name for a new one.',
        });
    }
});

type FormValues = z.infer<typeof reservationSchema>;

export function AddReservationDialog({ children, allListings, allUsers, isOpen, setIsOpen }: AddReservationDialogProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(reservationSchema),
        defaultValues: {
            guests: 1,
            units: 1,
            bills: [{ description: '', amount: 0, paid: true }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "bills"
    });

    const onSubmit = (data: FormValues) => {
        startTransition(async () => {
            const result = await createWalkInReservationAction(data);
            if (result.success) {
                toast({
                    title: "Reservation Created",
                    description: result.message,
                });
                form.reset();
                setIsOpen(false);
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive",
                });
            }
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-4">
                <DialogHeader>
                    <DialogTitle>Add New Reservation</DialogTitle>
                    <DialogDescription>
                        Quickly create a confirmed booking for a walk-in or new customer.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-y-auto overflow-x-visible p-4" style={{ paddingLeft: 4 }}>
                        <div className="space-y-4">
                            <div className="">
                                <FormField
                                    control={form.control}
                                    name="listingId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Venue / Listing</FormLabel>
                                            <FormControl>
                                                <Combobox
                                                    options={allListings.map(l => ({ label: `${l.name} (${l.location})`, value: l.id }))}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    placeholder="Select a listing..."
                                                    searchPlaceholder="Search listings..."
                                                    emptyPlaceholder="No listings found."
                                                    className="w-full"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="guests"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Number of Guests</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="units"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Number of Units</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <FormLabel>Customer</FormLabel>
                                <FormField
                                    control={form.control}
                                    name="userId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Combobox
                                                    options={allUsers.map(u => ({ label: `${u.name} (${u.email})`, value: u.id }))}
                                                    value={field.value}
                                                    onChange={(value) => { field.onChange(value); if (value) form.setValue('newCustomerName', undefined); }}
                                                    placeholder="Select an existing customer..."
                                                    searchPlaceholder="Search customers..."
                                                    emptyPlaceholder="No customers found."
                                                    className="w-full"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex items-center gap-4">
                                    <Separator className="flex-1" />
                                    <span className="text-xs text-muted-foreground">OR</span>
                                    <Separator className="flex-1" />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="newCustomerName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder="Enter a new customer name..." {...field} onChange={(e) => { field.onChange(e); if (e.target.value) form.setValue('userId', undefined); }} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <FormLabel>Initial Billing</FormLabel>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                                        <div className="grid grid-cols-3 gap-2 flex-grow">
                                            <FormField
                                                control={form.control}
                                                name={`bills.${index}.description`}
                                                render={({ field }) => (
                                                    <FormItem style={{ gridColumn: "1 / span 2" }}>
                                                        <FormLabel className="text-xs">Description</FormLabel>
                                                        <FormControl><Input placeholder="e.g. 3 Guinness bottles" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`bills.${index}.amount`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Amount</FormLabel>
                                                        <FormControl><Input type="number" step="1" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`bills.${index}.paid`}
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2 p-2">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                            className="items-center"
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="text-xs font-normal items-center">Paid</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-destructive p-4"><XCircle /></Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', amount: 0, paid: true })}><PlusCircle className="mr-2 h-4 w-4" /> Add Bill</Button>
                            </div>
                        </div>
                        <DialogFooter className="pt-4 gap-2">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Reservation</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
