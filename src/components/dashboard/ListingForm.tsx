
"use client";

import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LISTING_TYPES, type Listing, type ListingInventory, ListingTypes } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createListingAction, updateListingAction } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Loader2, PlusCircle, Trash2, Warehouse } from "lucide-react";
import { BackButton } from "../common/BackButton";


const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(LISTING_TYPES, { required_error: "Type is required."}),
  location: z.string().min(1, "Location is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  price: z.coerce.number().positive("Price must be a positive number."),
  price_unit: z.enum(['night', 'hour', 'person'], { required_error: "Price unit is required."}),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NGN'], { required_error: "Currency is required."}),
  max_guests: z.coerce.number().int().min(1, "Must accommodate at least 1 guest."),
  features: z.string().min(1, "Please list at least one feature."),
  images: z.array(z.string().url({ message: "Please enter a valid image URL." })).min(1, "At least one image is required."),
  inventory: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, "Unit name cannot be empty."),
    })
  ).min(0, "There must be at least 0 units."),
});

type FormValues = z.infer<typeof formSchema>;

interface ListingFormProps {
  listing?: Listing | null;
  inventory?: ListingInventory[];
  isDuplicate?: boolean;
}


export function ListingForm({ listing, inventory = [], isDuplicate = false }: ListingFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditMode = !!listing && !isDuplicate;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: listing?.name ? (isDuplicate ? `${listing.name} (Copy)`: listing.name) : "",
      type: listing?.type || undefined,
      location: listing?.location || "",
      description: listing?.description || "",
      price: listing?.price || 0,
      price_unit: listing?.price_unit || undefined,
      currency: listing?.currency || 'NGN',
      max_guests: listing?.max_guests || 1,
      features: (Array.isArray(listing?.features) ? listing.features.join(', ') : listing?.features) || "",
      images: (listing?.images && listing.images.length > 0) ? listing.images : ["https://placehold.co/800x600.png"],
      inventory: inventory && inventory.length > 0
          ? (isDuplicate ? inventory.map(i => ({ name: i.name })) : inventory.sort((a, b) => a.name.localeCompare(b.name)))
          : [{ name: 'Unit 1' }]
    },
  });

  const { fields: imageFields, append: appendImage, remove: removeImage, move: moveImage } = useFieldArray({
    control: form.control,
    name: "images",
  });

  const { fields: inventoryFields, append: appendInventory, remove: removeInventory } = useFieldArray({
    control: form.control,
    name: "inventory",
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    startTransition(async () => {
      const result = isEditMode
        ? await updateListingAction(listing!.id, data)
        : await createListingAction(data);

      if (result.success) {
        toast({
          title: `Listing ${isEditMode ? 'Updated' : 'Created'}!`,
          description: result.message,
        });
        router.push('/dashboard?tab=listings');
        router.refresh();
      } else {
        toast({
          title: `Error ${isEditMode ? 'updating' : 'creating'} listing`,
          description: result.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  const getTitle = () => {
    if (isEditMode) return 'Edit Listing';
    if (isDuplicate) return 'Duplicate Listing';
    return 'Add New Listing';
  }

  const getDescription = () => {
    if (isEditMode) return `Update the information for ${listing!.name}.`;
    if (isDuplicate) return `Create a new listing based on ${listing!.name}.`;
    return "Fill in the details to create a new listing.";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>{getTitle()}</CardTitle>
              <CardDescription>{getDescription()}</CardDescription>
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
                          {LISTING_TYPES.map(type => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="max_guests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Guests</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="e.g., 4" {...field} />
                    </FormControl>
                    <FormDescription>Per unit/room.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                      name="currency"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  <SelectItem value="NGN">NGN</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={form.control}
                      name="price_unit"
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
              </div>
              
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
              <div className="md:col-span-2 space-y-4">
                <FormLabel>Images</FormLabel>
                <div className="space-y-4">
                  {imageFields.map((field, index) => (
                    <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-2 border rounded-md bg-muted/20">
                      <img
                          src={form.watch(`images.${index}`) || 'https://placehold.co/100x100.png'}
                          alt={`Preview ${index + 1}`}
                          width={80}
                          height={80}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md bg-muted"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/100x100.png'; }}
                      />
                      <div className="flex-grow w-full">
                        <FormField
                          control={form.control}
                          name={`images.${index}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="sr-only">Image URL {index + 1}</FormLabel>
                              <FormControl>
                                <Input placeholder="https://example.com/image.png" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                          <Button type="button" size="icon" variant="ghost" onClick={() => moveImage(index, index - 1)} disabled={index === 0}>
                              <span className="sr-only">Move Up</span>
                              <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" onClick={() => moveImage(index, index + 1)} disabled={index === imageFields.length - 1}>
                              <span className="sr-only">Move Down</span>
                              <ArrowDown className="h-4 w-4" />
                          </Button>
                      </div>
                      <Button type="button" size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => imageFields.length > 1 ? removeImage(index) : form.setValue(`images.0`, '')} >
                          <span className="sr-only">Remove</span>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="outline" onClick={() => appendImage("https://placehold.co/800x600.png")}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Image
                </Button>
                 <FormMessage>{form.formState.errors.images?.root?.message}</FormMessage>
              </div>

              <div className="md:col-span-2 space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <FormLabel>Inventory Units</FormLabel>
                    <FormDescription>Manage the individual bookable units for this listing.</FormDescription>
                  </div>
                  <div className="space-y-3">
                      {inventoryFields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                           <FormField
                              control={form.control}
                              name={`inventory.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="flex-grow">
                                  <FormControl>
                                      <div className="relative">
                                          <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                          <Input placeholder={`Unit ${index + 1} Name`} {...field} className="pl-9" />
                                      </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="button" size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeInventory(index)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove Unit</span>
                            </Button>
                        </div>
                      ))}
                  </div>
                   <Button type="button" variant="outline" size="sm" onClick={() => appendInventory({ name: `Unit ${inventoryFields.length + 1}` })}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Unit
                    </Button>
                    <FormMessage>{form.formState.errors.inventory?.root?.message}</FormMessage>
              </div>


            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <BackButton disabled={isPending} />
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : isDuplicate ? 'Create Duplicate' : 'Create Listing'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

    