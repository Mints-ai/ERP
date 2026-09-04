"use client";

import React from "react";
import Image from "next/image";

interface LoadingScreenProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({
  message = "Loading Workspace...",
  subtext = "Mints Global ERP",
  fullScreen = true,
}: LoadingScreenProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden select-none ${
        fullScreen ? "fixed inset-0 z-50 h-screen w-screen" : "w-full h-full min-h-[300px]"
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-primary/15 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

      {/* Center content container */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4">
        {/* Animated Brand Emblem with glowing orbital ring */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing outer ring */}
          <div className="absolute -inset-3 rounded-full border border-primary/20 animate-ping opacity-25" />
          
          {/* Rotating gradient ring */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-primary via-emerald-500/40 to-transparent animate-spin [animation-duration:3s] opacity-70 blur-[1px]" />
          
          {/* Icon badge backdrop */}
          <div className="relative w-20 h-20 rounded-2xl bg-card/80 backdrop-blur-md border border-border/80 shadow-2xl flex items-center justify-center p-3 overflow-hidden">
            <Image
              src="/icon.png"
              alt="Mints Global"
              width={56}
              height={56}
              priority
              className="w-full h-full object-contain animate-pulse [animation-duration:2.5s]"
            />
          </div>
        </div>

        {/* Text & Status */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-sm font-medium text-foreground tracking-wide flex items-center gap-2">
            <span>{message}</span>
          </p>
          <span className="text-xs font-mono tracking-widest text-muted-foreground uppercase opacity-70">
            {subtext}
          </span>
        </div>

        {/* Smooth modern progress indicator bar */}
        <div className="w-36 h-1 rounded-full bg-muted/60 overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full animate-indeterminate" />
        </div>
      </div>
    </div>
  );
}
