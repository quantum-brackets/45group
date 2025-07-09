"use client";

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Review, User } from '@/lib/types';
import { addOrUpdateReviewAction, approveReviewAction, deleteReviewAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, Check, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const [adminActionPending, startAdminActionTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const isAdmin = session?.role === 'admin';
  const approvedReviews = reviews.filter(review => review.status === 'approved');
  const reviewCount = approvedReviews.length;
  const currentUserReview = reviews.find(review => review.user_id === session?.id);
  
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: currentUserReview?.rating || 0,
      comment: currentUserReview?.comment || '',
    }
  });

  const reviewsToDisplay = isAdmin 
    ? [...reviews].sort((a, b) => {
        const aIsApproved = a.status === 'approved';
        const bIsApproved = b.status === 'approved';
        if (!aIsApproved && bIsApproved) return -1;
        if (aIsApproved && !bIsApproved) return 1;
        return 0;
      })
    : approvedReviews;

  const onSubmit = (data: ReviewFormValues) => {
    startTransition(async () => {
      const result = await addOrUpdateReviewAction({ listingId, ...data });
      if (result.success) {
        toast({ title: 'Review Submitted', description: result.message });
        setShowForm(false);
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleToggleForm = () => {
    setShowForm(prev => !prev);
    if (!showForm) {
      form.reset({
        rating: currentUserReview?.rating || 0,
        comment: currentUserReview?.comment || '',
      });
    }
  };

  const handleApprove = (reviewId: string) => {
    startAdminActionTransition(async () => {
      const result = await approveReviewAction({ listingId, reviewId });
      if (result.success) {
        toast({ title: 'Success', description: result.message });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleDelete = (reviewId: string) => {
    startAdminActionTransition(async () => {
      const result = await deleteReviewAction({ listingId, reviewId });
      if (result.success) {
        toast({ title: 'Success', description: result.message });
      } else {
        toast({ title: 'Error', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2" />
                {averageRating.toFixed(1)} &middot; {reviewCount} review{reviewCount === 1 ? '' : 's'}
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

        {reviewsToDisplay.length > 0 ? (
          reviewsToDisplay.map((review, index) => (
            <React.Fragment key={review.id}>
              <div className="flex flex-col sm:flex-row gap-4">
                <Avatar>
                  <AvatarImage src={review.avatar} alt={review.author} data-ai-hint="person face" />
                  <AvatarFallback>{review.author.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold">{review.author}</p>
                    <div className="flex items-center gap-0.5 text-primary">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'fill-muted stroke-muted-foreground'}`} />
                      ))}
                    </div>
                    {isAdmin && (
                        <Badge variant={review.status === 'approved' ? 'default' : 'secondary'} className={review.status === 'approved' ? 'bg-accent text-accent-foreground' : ''}>
                            {review.status || 'pending'}
                        </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-start">
                        {review.status !== 'approved' && (
                            <Button size="sm" variant="outline" onClick={() => handleApprove(review.id)} disabled={adminActionPending}>
                                {adminActionPending ? <Loader2 className="mr-0 sm:mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-0 sm:mr-2 h-4 w-4"/>}
                                <span className="hidden sm:inline">Approve</span>
                            </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={adminActionPending}>
                                <Trash2 className="h-4 w-4 mr-0 sm:mr-2"/><span className="hidden sm:inline">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the review by {review.author}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(review.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
              </div>
              {index < reviewsToDisplay.length - 1 && <Separator />}
            </React.Fragment>
          ))
        ) : (
          !showForm && <p className="text-muted-foreground text-center py-4">{isAdmin && reviews.length > 0 ? 'No approved reviews yet.' : 'Be the first to leave a review!'}</p>
        )}
      </CardContent>
    </Card>
  );
}
