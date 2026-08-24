"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <Button variant="ghost" size="sm" onClick={() => router.back()}>
      <ChevronLeft className="h-5 w-5 mr-1" />
      Back
    </Button>
  );
}
