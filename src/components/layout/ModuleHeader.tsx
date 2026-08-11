import React from "react";
import { cn } from "@/lib/utils";

interface ModuleHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function ModuleHeader({
  title,
  description,
  icon,
  action,
  children,
  className,
}: ModuleHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", className)}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="text-xs text-foreground/40 mt-1">{description}</p>
        )}
      </div>
      {(action || children) && (
        <div className="flex items-center gap-4">
          {children}
          {action}
        </div>
      )}
    </div>
  );
}
