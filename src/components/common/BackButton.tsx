"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';

type ButtonVariant = "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;

interface BackButtonProps {
    children?: React.ReactNode;
    variant?: ButtonVariant;
    className?: string;
    href?: string;
}

export function BackButton({ children = "Back", variant = "outline", className, href }: BackButtonProps) {
  const router = useRouter();

  if (href) {
    return (
      <Button asChild variant={variant} className={className}>
        <Link href={href}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {children}
        </Link>
      </Button>
    );
  }

  return (
    <Button variant={variant} onClick={() => router.back()} className={className}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}
