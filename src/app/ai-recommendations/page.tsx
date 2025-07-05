import { RecommendationForm } from '@/components/ai/RecommendationForm';
import { Lightbulb } from 'lucide-react';

export default function AiRecommendationsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
            <Lightbulb className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-headline font-bold tracking-tight lg:text-5xl">
          AI-Powered Recommendations
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Tell us what you're looking for, and our AI will find the perfect venue for you.
        </p>
      </header>
      
      <RecommendationForm />
    </div>
  );
}
