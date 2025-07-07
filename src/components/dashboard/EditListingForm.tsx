
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Listing } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateListingAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(['hotel', 'events', 'restaurant'], { required_error: "Type is required."}),
  location: z.string().min(1, "Location is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  priceUnit: z.enum(['night', 'hour', 'person'], { required_error: "Price unit is required."}),
  currency: z.enum(['USD', 'EUR', 'GBP'], { required_error: "Currency is required." }),
  maxGuests: z.coerce.number().int().min(1, "Must accommodate at least 1 guest."),
  features: z.string().min(1, "Please list at least one feature."),
});

type FormValues = z.infer<typeof formSchema>;

interface EditListingFormProps {
  listing: Listing;
}

export function EditListingForm({ listing }: EditListingFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...listing,
      features: listing.features.join(', '),
      currency: listing.currency || 'USD',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    startTransition(async () => {
      const result = await updateListingAction(listing.id, data);
      if (result.success) {
        toast({
          title: "Listing Updated Successfully!",
          description: result.message,
        });
        router.push('/dashboard');
      } else {
        toast({
          title: "Error updating listing",
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Listing Details</CardTitle>
            <CardDescription>Update the information for this listing. Click save when you're done.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Grand Hyatt Hotel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New York, NY" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a listing type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="events">Events</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
             />
             <div className="grid grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="e.g., 350" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="priceUnit"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a unit" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="night">/ night</SelectItem>
                            <SelectItem value="hour">/ hour</SelectItem>
                            <SelectItem value="person">/ person</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a currency" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
             </div>
            <FormField
              control={form.control}
              name="maxGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Guests</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="e.g., 4" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A detailed description of the listing..."
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="md:col-span-2">
                <FormField
                control={form.control}
                name="features"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Features</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="e.g., Free WiFi, Pool, Gym"
                        {...field}
                        />
                    </FormControl>
                    <FormDescription>
                        Please list features separated by a comma.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={isPending}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
