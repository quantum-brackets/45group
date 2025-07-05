"use client";

import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getRecommendation, RecommendationOutput } from "@/ai/flows/recommendation-flow";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Building, MapPin, Phone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const formSchema = z.object({
  preferences: z.string().min(10, "Please describe your preferences in a bit more detail."),
  location: z.string().min(2, "Location is required."),
  numberOfGuests: z.coerce.number().min(1, "At least one guest is required."),
  availability: z.date({ required_error: "A date is required." }),
});

type FormValues = z.infer<typeof formSchema>;

export function RecommendationForm() {
  const [recommendation, setRecommendation] = useState<RecommendationOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      preferences: "",
      location: "",
      numberOfGuests: 1,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    setError(null);
    setRecommendation(null);
    try {
      const result = await getRecommendation({
        ...data,
        availability: data.availability.toISOString(),
      });
      setRecommendation(result);
    } catch (err) {
      setError("Sorry, we couldn't get a recommendation. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Your Preferences</CardTitle>
              <CardDescription>Fill out the details below for a tailored recommendation.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-4">
                <FormField
                  control={form.control}
                  name="preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are you looking for?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., A quiet, romantic Italian restaurant for a birthday dinner, with outdoor seating."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Downtown, Manhattan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numberOfGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Guests</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                 <FormField
                    control={form.control}
                    name="availability"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} size="lg">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Get Recommendation
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      {isLoading && (
        <div className="text-center p-8">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Our AI is thinking...</p>
        </div>
      )}

      {error && (
        <Card className="mt-8 border-destructive bg-destructive/10">
          <CardContent className="p-6">
            <p className="text-destructive font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {recommendation && (
        <Card className="mt-8 animate-in fade-in-50 duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl text-accent">
                <Sparkles />
                Here's Your Recommendation!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-xl font-bold font-headline">{recommendation.venueName}</h3>
            <div className="space-y-2 text-foreground/90">
                <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 mt-1 text-muted-foreground" />
                    <p><span className="font-semibold">Type:</span> {recommendation.venueType}</p>
                </div>
                <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 mt-1 text-muted-foreground" />
                    <p><span className="font-semibold">Address:</span> {recommendation.address}</p>
                </div>
                <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-1 text-muted-foreground" />
                    <p><span className="font-semibold">Contact:</span> {recommendation.contactInformation}</p>
                </div>
            </div>
            <p className="text-muted-foreground italic pt-2 border-t mt-4">{recommendation.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
