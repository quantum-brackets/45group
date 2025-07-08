"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type ButtonVariant = "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;

interface BackButtonProps {
    children?: React.ReactNode;
    variant?: ButtonVariant;
    className?: string;
}

export function BackButton({ children = "Back", variant = "outline", className }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button variant={variant} onClick={() => router.back()} className={className}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}
