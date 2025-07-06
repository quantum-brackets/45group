
import { Button } from "@/components/ui/button";
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

interface ForbiddenPageProps {
    title: string;
    message: string;
}

export function ForbiddenPage({ title, message }: ForbiddenPageProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center px-4">
            <div className="inline-flex items-center justify-center bg-destructive/10 text-destructive p-4 rounded-full mb-4">
                <ShieldAlert className="h-10 w-10" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl">
                {message}
            </p>
            <div className="mt-8">
                <Button asChild>
                    <Link href="/">Go to Homepage</Link>
                </Button>
            </div>
        </div>
    );
}
