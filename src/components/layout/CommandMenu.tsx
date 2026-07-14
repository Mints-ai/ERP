"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  Users,
  Briefcase,
  FolderKanban,
  FileText,
  Settings,
  LayoutDashboard,
  LogOut,
  Building2,
  Calendar,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  // Toggle the menu when ⌘K or Ctrl+K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div 
        className="w-full max-w-xl mx-auto border border-border shadow-2xl rounded-xl bg-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col w-full h-full bg-transparent text-foreground">
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              autoFocus
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Type a command or search..." 
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            
            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard Home</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/hr"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Users className="mr-2 h-4 w-4" />
                <span>HR & Directory</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/finance"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Wallet className="mr-2 h-4 w-4" />
                <span>Finance & Invoices</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/projects"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>Projects</span>
              </Command.Item>
            </Command.Group>
            
            <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/hr/new"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Add New Employee</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/finance/new"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <FileText className="mr-2 h-4 w-4" />
                <span>Create Invoice</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="System" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => logout())}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-accent text-red-500 aria-selected:text-red-500"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </Command.Item>
            </Command.Group>
            
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
