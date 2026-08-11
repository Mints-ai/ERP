import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface DataTableShellProps {
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export function DataTableShell({ children, className, loading }: DataTableShellProps) {
  if (loading) {
    return (
      <Card className={cn("border-border shadow-sm", className)}>
        <CardContent className="p-12 flex justify-center items-center">
          <div className="animate-pulse bg-muted h-12 w-12 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border shadow-sm overflow-hidden", className)}>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  );
}
