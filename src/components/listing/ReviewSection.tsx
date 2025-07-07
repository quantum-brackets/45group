"use client";

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Review, User } from '@/lib/types';
import { addOrUpdateReviewAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const reviewFormSchema = z.object({
  rating: z.coerce.number().min(1, "Rating is required.").max(5),
  comment: z.string().min(10, "Comment must be at least 10 characters long."),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewSectionProps {
  listingId: string;
  reviews: Review[];
  averageRating: number;
  session: User | null;
}

const StarRating = ({ field }: { field: any }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={ratingValue} className="cursor-pointer">
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => field.onChange(ratingValue)}
              className="hidden"
            />
            <Star
              className={`h-6 w-6 transition-colors ${
                ratingValue <= (hover || field.value)
                  ? 'text-primary fill-primary'
                  : 'text-muted-foreground'
              }`}
              onMouseEnter={() => setHover(ratingValue)}
              onMouseLeave={() => setHover(0)}
            />
          </label>
        );
      })}
    </div>
  );
};


export function ReviewSection({ listingId, reviews, averageRating, session }: ReviewSectionProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const currentUserReview = reviews.find(review => review.userId === session?.id);
  
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: currentUserReview?.rating || 0,
      comment: currentUserReview?.comment || '',
    }
  });

  const onSubmit = (data: ReviewFormValues) => {
    startTransition(async () => {
      const result = await addOrUpdateReviewAction({ listingId, ...data });
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setShowForm(false);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleToggleForm = () => {
    setShowForm(prev => !prev);
    if (!showForm) {
      // If opening form, reset with latest values
      form.reset({
        rating: currentUserReview?.rating || 0,
        comment: currentUserReview?.comment || '',
      });
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2" />
                {averageRating.toFixed(1)} &middot; {reviews.length} review{reviews.length === 1 ? '' : 's'}
            </CardTitle>
            {session && (
              <Button variant="outline" onClick={handleToggleForm}>
                {currentUserReview ? 'Edit Your Review' : 'Write a Review'}
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showForm && (
            <div className="p-4 border rounded-lg bg-card mb-6">
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="rating"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Rating</FormLabel>
                                    <FormControl>
                                       <StarRating field={field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="comment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Review</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Share your experience..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {currentUserReview ? 'Update Review' : 'Submit Review'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        )}

        {reviews.length > 0 ? (
          reviews.map((review, index) => (
            <React.Fragment key={review.id}>
              <div className="flex gap-4">
                <Avatar>
                  <AvatarImage src={review.avatar} alt={review.author} data-ai-hint="person face" />
                  <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{review.author}</p>
                    <div className="flex items-center gap-0.5 text-primary">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'fill-muted stroke-muted-foreground'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                </div>
              </div>
              {index < reviews.length -1 && <Separator />}
            </React.Fragment>
          ))
        ) : (
          !showForm && <p className="text-muted-foreground text-center py-4">Be the first to leave a review!</p>
        )}
      </CardContent>
    </Card>
  );
}
