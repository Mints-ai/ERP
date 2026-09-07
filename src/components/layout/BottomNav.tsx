"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, CalendarOff, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const handleOpenMore = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("mints:open-mobile-nav"));
    }
  };

  const navItems = [
    {
      label: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
    {
      label: "Attendance",
      href: "/dashboard/attendance",
      icon: Clock,
      isActive: pathname === "/dashboard/attendance" || pathname.startsWith("/dashboard/attendance/"),
    },
    {
      label: "Leaves",
      href: "/dashboard/leaves",
      icon: CalendarOff,
      isActive: pathname === "/dashboard/leaves" || pathname.startsWith("/dashboard/leaves/"),
    },
  ];

  const isMoreActive = !navItems.some((item) => item.isActive);

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-2 py-1.5 transition-colors"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[64px] select-none",
                item.isActive
                  ? "text-primary font-bold scale-105"
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-lg transition-colors",
                  item.isActive ? "bg-primary/10" : "bg-transparent"
                )}
              >
                <Icon className={cn("h-5 w-5", item.isActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
              </div>
              <span className="text-[11px] leading-tight tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={handleOpenMore}
          className={cn(
            "flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[64px] cursor-pointer select-none",
            isMoreActive
              ? "text-primary font-bold scale-105"
              : "text-muted-foreground hover:text-foreground font-medium"
          )}
          aria-label="Open all modules menu"
        >
          <div
            className={cn(
              "p-1 rounded-lg transition-colors",
              isMoreActive ? "bg-primary/10" : "bg-transparent"
            )}
          >
            <Menu className={cn("h-5 w-5", isMoreActive ? "stroke-[2.5]" : "stroke-[1.8]")} />
          </div>
          <span className="text-[11px] leading-tight tracking-tight mt-0.5">More</span>
        </button>
      </div>
    </nav>
  );
}
