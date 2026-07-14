"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard Boundary Error:", error);
  }, [error]);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border shadow-sm rounded-2xl p-8 text-center flex flex-col items-center">
        <div className="h-16 w-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
          <AlertOctagon className="h-8 w-8 text-rose-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2 uppercase tracking-wide">
          Dashboard Component Error
        </h2>
        <p className="text-sm text-foreground/50 mb-8 leading-relaxed">
          Something went wrong while loading this section of the dashboard. Please try refreshing or contact support if the issue persists.
        </p>
        <button
          onClick={() => reset()}
          className="btn-primary flex items-center justify-center gap-2 h-10 px-6 rounded-xl text-sm font-bold w-full"
        >
          <RefreshCcw className="h-4 w-4" />
          Reload Section
        </button>
      </div>
    </div>
  );
}
