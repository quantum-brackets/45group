
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from 'react';

type ButtonVariant = "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;

interface BackButtonProps {
    children?: React.ReactNode;
    variant?: ButtonVariant;
    className?: string;
    // The component's own disabled state can be passed in from the parent (e.g., while a form is pending)
    disabled?: boolean;
}

export function BackButton({ children = "Back", variant = "outline", className, disabled = false }: BackButtonProps) {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    // This check ensures we are on the client and there's a history stack to go back to.
    setHasHistory(window.history.length > 1);
  }, []);
  
  // Per the request, the button should only be visible if there's history.
  if (!hasHistory) {
      return null;
  }
  
  return (
    <Button 
      variant={variant} 
      onClick={() => router.back()} 
      className={className}
      disabled={disabled}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {children}
    </Button>
  );
}
