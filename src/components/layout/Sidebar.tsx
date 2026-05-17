"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/permissions";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Users, 
  Briefcase, 
  CheckSquare, 
  UserSquare2, 
  Banknote, 
  CalendarOff, 
  Megaphone, 
  BarChart3, 
  Settings,
  LogOut,
  Clock,
  Target,
  Monitor,
  LineChart,
  GanttChartSquare,
  Cloud,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: Home, permission: null },
      { name: "Team Chat", href: "/dashboard/chat", icon: MessageSquare, permission: null },
      { name: "CRM & Sales", href: "/dashboard/crm", icon: LineChart, permission: "CREATE_PROJECT" },
      { name: "Projects", href: "/dashboard/projects", icon: Briefcase, permission: null },
      { name: "Capacity", href: "/dashboard/projects/capacity", icon: GanttChartSquare, permission: "CREATE_PROJECT" },
      { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare, permission: null },
      { name: "Cloud Drive", href: "/dashboard/files", icon: Cloud, permission: null },
    ]
  },
  {
    label: "People",
    items: [
      { name: "HR", href: "/dashboard/hr", icon: Users, permission: null },
      { name: "Payroll", href: "/dashboard/hr/payroll", icon: Banknote, permission: "MANAGE_USERS" },
      { name: "Goals (OKRs)", href: "/dashboard/hr/okrs", icon: Target, permission: "MANAGE_USERS" },
      { name: "Assets", href: "/dashboard/hr/assets", icon: Monitor, permission: "MANAGE_USERS" },
      { name: "Clients", href: "/dashboard/clients", icon: UserSquare2, permission: "VIEW_ALL_EMPLOYEES" },
      { name: "Attendance", href: "/dashboard/attendance", icon: Clock, permission: null },
      { name: "Leaves", href: "/dashboard/leaves", icon: CalendarOff, permission: null },
      { name: "Notice Board", href: "/dashboard/announcements", icon: Megaphone, permission: null },
    ]
  },
  {
    label: "Finance",
    items: [
      { name: "Finance", href: "/dashboard/finance", icon: Banknote, permission: "MANAGE_FINANCE" },
      { name: "Reports", href: "/dashboard/reports", icon: BarChart3, permission: "MANAGE_FINANCE" },
    ]
  },
  {
    label: "System",
    items: [
      { name: "Settings", href: "/dashboard/settings", icon: Settings, permission: "SYSTEM_SETTINGS" },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };
  
  return (
    <motion.aside 
      initial={{ width: 80 }}
      animate={{ width: isHovered ? 260 : 80 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed inset-y-0 left-0 z-50 glass-dark hidden lg:flex flex-col overflow-hidden"
    >
      <div className="h-16 flex items-center px-6 font-bold text-xl tracking-tight shrink-0">
        <div className="w-8 h-8 rounded-md bg-olive-500 text-white flex items-center justify-center shrink-0 text-sm shadow-md">
          MG
        </div>
        <AnimatePresence>
          {isHovered && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="ml-3 whitespace-nowrap"
            >
              MINTS GLOBAL
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {NAV_GROUPS.map((group, idx) => {
          // Filter items based on permissions
          const visibleItems = group.items.filter(item => 
            !item.permission || canAccess(user?.role, item.permission as any)
          );
          
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-xs font-semibold text-olive-400 uppercase tracking-wider mb-2 h-4 overflow-hidden">
                <AnimatePresence>
                  {isHovered ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap inline-block"
                    >
                      {group.label}
                    </motion.span>
                  ) : (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap inline-block"
                    >
                      —
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              
              {visibleItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "relative flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all group overflow-hidden",
                      isActive 
                        ? "bg-white text-olive-900 shadow-sm" 
                        : "text-olive-100 hover:bg-olive-800 hover:text-white"
                    )}
                    title={!isHovered ? item.name : undefined}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-olive-500 rounded-l-lg" 
                      />
                    )}
                    <item.icon className={cn("shrink-0 h-5 w-5", isActive ? "text-olive-600" : "text-olive-300 group-hover:text-olive-200")} />
                    
                    <AnimatePresence>
                      {isHovered && (
                        <motion.span 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="ml-3 whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-olive-800 bg-olive-900/50 shrink-0">
        <div className="flex items-center">
          <Avatar className="h-10 w-10 border border-olive-700 shrink-0 cursor-pointer">
            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
            <AvatarFallback className="bg-olive-800 text-olive-200 text-xs">
              {getInitials(user?.displayName || "U")}
            </AvatarFallback>
          </Avatar>
          
          <AnimatePresence>
            {isHovered && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-3 flex-1 overflow-hidden"
              >
                <p className="text-sm font-medium text-white truncate">{user?.displayName || "User"}</p>
                <p className="text-xs text-olive-400 capitalize truncate">{user?.role?.replace("_", " ") || "Employee"}</p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {isHovered && (
              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => logout()}
                className="p-2 ml-auto text-olive-400 hover:text-red-400 hover:bg-olive-800 rounded-md transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
