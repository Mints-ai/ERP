"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Bell, Search, Menu, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette } from "./CommandPalette";

export function TopNav() {
  const { user, logout } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      <header className="h-16 border-b border-white/60 bg-white/60 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 z-40 sticky top-0 shadow-sm">
        <div className="flex items-center flex-1 gap-4 lg:gap-8">
          <button className="lg:hidden text-olive-600 hover:text-olive-900 transition-colors">
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-olive-900 tracking-tight">
              {greeting}, {user?.displayName ? user.displayName.split(' ')[0] : 'there'}
            </h2>
            <p className="text-xs text-olive-500">{today}</p>
          </div>

          <button 
            onClick={() => setCmdOpen(true)}
            className="hidden md:flex relative w-full max-w-sm items-center gap-2 rounded-full border border-olive-200 bg-olive-50/50 px-4 py-2 text-sm text-olive-500 shadow-inner hover:bg-olive-100/50 transition-colors cursor-text group"
          >
            <Search className="h-4 w-4 text-olive-400 group-hover:text-olive-600 transition-colors" />
            <span>Search projects, people, docs...</span>
            <kbd className="pointer-events-none absolute right-3 hidden h-5 select-none items-center gap-1 rounded border border-olive-200 bg-white px-1.5 font-mono text-[10px] font-medium text-olive-500 opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <Sheet>
            <SheetTrigger className="relative text-olive-500 hover:text-olive-900 p-2 rounded-full hover:bg-olive-100 transition-colors cursor-pointer">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white ring-2 ring-white/50 animate-pulse"></span>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader className="border-b pb-4 mb-4">
                <SheetTitle className="flex justify-between items-center">
                  <span>Notifications</span>
                  <button className="text-xs text-olive-500 hover:text-olive-900 font-normal flex items-center">
                    <Check className="h-3 w-3 mr-1" /> Mark all read
                  </button>
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                {/* Placeholder notifications */}
                <div className="flex gap-4 p-3 rounded-lg bg-olive-50 border border-olive-100">
                  <div className="h-2 w-2 mt-2 rounded-full bg-olive-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-olive-900">Leave Request Approved</p>
                    <p className="text-xs text-olive-500 mt-1">Your leave for Dec 24 - Jan 2 was approved by Management.</p>
                    <p className="text-[10px] text-olive-400 mt-2 uppercase tracking-wider">2 hours ago</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 rounded-lg hover:bg-olive-50/50 border border-transparent hover:border-olive-100 transition-colors cursor-pointer">
                  <div className="h-2 w-2 mt-2 rounded-full bg-transparent shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-olive-900">New Project Assigned</p>
                    <p className="text-xs text-olive-500 mt-1">You were added to "Q4 Marketing Redesign" by Sarah.</p>
                    <p className="text-[10px] text-olive-400 mt-2 uppercase tracking-wider">Yesterday</p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 focus:outline-none hover:bg-olive-50 p-1 pr-3 rounded-full transition-colors cursor-pointer border border-transparent hover:border-olive-200">
                <Avatar className="h-8 w-8 border border-olive-200 shadow-sm">
                  <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                  <AvatarFallback className="bg-olive-100 text-olive-700 font-semibold text-xs">
                    {getInitials(user?.displayName || "User")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-olive-900 leading-none">{user?.displayName || "User"}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <p className="text-[10px] text-olive-500 uppercase tracking-wider font-medium">{user?.role?.replace("_", " ") || "Employee"}</p>
                  </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 shadow-xl border-olive-200">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-olive-500">My Account</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-olive-100" />
              <DropdownMenuItem className="hover:bg-olive-50 focus:bg-olive-50 cursor-pointer text-olive-700">Profile</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-olive-50 focus:bg-olive-50 cursor-pointer text-olive-700">Settings</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-olive-100" />
              <DropdownMenuItem onClick={() => logout()} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer font-medium">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </>
  );
}
