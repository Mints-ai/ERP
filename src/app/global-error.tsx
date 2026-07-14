"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import "@/app/globals.css"; // Ensure styles are loaded for this fallback

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Layout Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center justify-center p-8 border border-border bg-card shadow-2xl rounded-2xl max-w-md w-full mx-4 text-center">
          <div className="p-4 bg-rose-500/10 rounded-full mb-4">
            <AlertCircle className="h-10 w-10 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold mb-2 tracking-tight">System Failure</h2>
          <p className="text-sm text-foreground/60 mb-8 leading-relaxed">
            A critical error occurred while rendering the application root. Our team has been notified.
          </p>
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="h-4 w-4" /> Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
