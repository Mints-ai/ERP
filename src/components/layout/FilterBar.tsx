import React from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-col md:flex-row gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm", className)}>
      {children}
    </div>
  );
}
