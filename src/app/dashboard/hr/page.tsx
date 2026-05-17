"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ROLE_META } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Building2, LayoutGrid, Network, Mail, MessageSquare, Calendar, Briefcase } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { cn } from "@/lib/utils";

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "tree">("grid");
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  useEffect(() => {
    // Only fetch active employees for the directory
    const q = query(
      collection(db, "employees"),
      where("isActive", "==", true),
      orderBy("fullName")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const emps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(emps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    
    return matchesSearch && matchesDept && matchesRole;
  });

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  // Basic mock tree logic: Founder -> Directors -> Managers -> Employees
  const founders = filteredEmployees.filter(e => e.role === "founder" || e.role === "c_suite");
  const others = filteredEmployees.filter(e => e.role !== "founder" && e.role !== "c_suite");

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-olive-900">People</h1>
          <p className="text-olive-600 mt-1">Manage and view the organization's intelligence.</p>
        </div>
        
        <RoleGuard permission="VIEW_ALL_EMPLOYEES">
          <div className="flex items-center gap-4">
            <div className="flex gap-1 bg-olive-100 p-1 rounded-lg border border-olive-200 shadow-inner hidden md:flex">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all", viewMode === "grid" ? "bg-white text-olive-900 shadow-sm" : "text-olive-600 hover:text-olive-900")}
              >
                <LayoutGrid className="w-4 h-4 mr-2" /> Grid
              </button>
              <button 
                onClick={() => setViewMode("tree")}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all", viewMode === "tree" ? "bg-white text-olive-900 shadow-sm" : "text-olive-600 hover:text-olive-900")}
              >
                <Network className="w-4 h-4 mr-2" /> Org Chart
              </button>
            </div>
            
            <RoleGuard permission="MANAGE_USERS">
              <Link href="/dashboard/hr/new">
                <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md">
                  <Plus className="mr-2 h-4 w-4" /> Add Person
                </Button>
              </Link>
            </RoleGuard>
          </div>
        </RoleGuard>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-olive-200 shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-olive-400" />
          <Input
            placeholder="Search by name or title..."
            className="pl-10 bg-olive-50 border-olive-200 focus-visible:ring-olive-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4 md:w-1/2">
          <Select value={deptFilter} onValueChange={(val) => setDeptFilter(val || "all")}>
            <SelectTrigger className="flex-1 bg-olive-50 border-olive-200 focus:ring-olive-500">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val || "all")}>
            <SelectTrigger className="flex-1 bg-olive-50 border-olive-200 focus:ring-olive-500">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {Object.entries(ROLE_META).map(([key, meta]) => (
                <SelectItem key={key} value={key}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-olive-200 border-dashed">
          <h3 className="text-lg font-medium text-olive-900">No people found</h3>
          <p className="text-sm text-olive-500 mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredEmployees.map((emp) => {
              const roleMeta = ROLE_META[emp.role] || { label: "Employee", color: "bg-olive-100 text-olive-700 border-olive-200" };
              const isOnline = Math.random() > 0.3; // Mock online status
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className="group"
                >
                  <Card className="hover:shadow-modal transition-all duration-300 cursor-pointer overflow-hidden border-olive-200 hover:border-olive-300 h-full relative">
                    <div className="h-20 bg-gradient-to-r from-olive-100 to-olive-200"></div>
                    <CardContent className="px-4 pb-4 pt-0 text-center relative">
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 rounded-full p-1 bg-white shadow-sm">
                        <div className="relative">
                          <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                            <AvatarImage src={emp.profilePhotoURL} alt={emp.fullName} />
                            <AvatarFallback className="bg-olive-100 text-olive-700 text-xl font-medium">
                              {getInitials(emp.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          {/* Status Dot */}
                          <div className={cn("absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white", isOnline ? "bg-green-500" : "bg-gray-400")} title={isOnline ? "Active today" : "Offline"} />
                        </div>
                      </div>
                      
                      <div className="mt-12 space-y-3">
                        <div>
                          <h3 className="font-bold text-lg text-olive-900 line-clamp-1 group-hover:text-olive-700 transition-colors" title={emp.fullName}>
                            {emp.fullName}
                          </h3>
                          <p className="text-sm text-olive-600 line-clamp-1 font-medium" title={emp.jobTitle}>
                            {emp.jobTitle || "No Title"}
                          </p>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          {emp.department && (
                            <Badge variant="secondary" className="bg-olive-50 text-olive-700 hover:bg-olive-100 font-normal border border-olive-200 shadow-none">
                              <Building2 className="w-3 h-3 mr-1" />
                              {emp.department}
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn("font-medium shadow-none", roleMeta.color)}>
                            {roleMeta.label}
                          </Badge>
                        </div>
                        
                        {emp.role === "intern" && (
                          <div className="mt-4 pt-4 border-t border-olive-100 w-full text-left">
                            <div className="flex justify-between text-[10px] text-olive-500 font-semibold mb-1 uppercase tracking-wider">
                              <span>Internship Progress</span>
                              <span>65%</span>
                            </div>
                            <div className="w-full h-1.5 bg-olive-100 rounded-full overflow-hidden">
                              <div className="h-full bg-olive-500 rounded-full" style={{ width: "65%" }}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* Org Chart View - Simplified Mock Implementation */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-olive-200 shadow-card p-12 overflow-x-auto min-h-[500px] flex justify-center">
          <div className="flex flex-col items-center">
            {/* Top Level */}
            <div className="flex gap-16 mb-16 relative">
              {founders.length > 0 ? founders.map(emp => (
                <div key={emp.id} className="flex flex-col items-center cursor-pointer hover:-translate-y-1 transition-transform" onClick={() => setSelectedEmployee(emp)}>
                  <Avatar className="h-20 w-20 border-4 border-olive-600 shadow-md z-10 bg-white">
                    <AvatarImage src={emp.profilePhotoURL} />
                    <AvatarFallback className="text-xl font-bold bg-olive-100 text-olive-700">{getInitials(emp.fullName)}</AvatarFallback>
                  </Avatar>
                  <p className="font-bold text-olive-900 mt-3">{emp.fullName}</p>
                  <p className="text-sm text-olive-500 font-medium">{ROLE_META[emp.role]?.label || "Executive"}</p>
                </div>
              )) : (
                <div className="text-olive-400 italic">No executives defined</div>
              )}
              {/* Connector line down */}
              {founders.length > 0 && others.length > 0 && (
                <div className="absolute top-full left-1/2 -ml-px w-0.5 h-16 bg-olive-300"></div>
              )}
            </div>

            {/* Second Level */}
            {others.length > 0 && (
              <div className="relative pt-6 w-full flex justify-center">
                {/* Horizontal connector line */}
                <div className="absolute top-0 left-12 right-12 h-0.5 bg-olive-300"></div>
                <div className="flex gap-6 justify-center flex-wrap max-w-6xl">
                  {others.map(emp => {
                    const roleMeta = ROLE_META[emp.role] || { label: "Employee", color: "bg-olive-100 text-olive-700 border-olive-200" };
                    return (
                      <div key={emp.id} className="flex flex-col items-center relative cursor-pointer hover:-translate-y-1 transition-transform bg-olive-50 p-4 rounded-xl border border-olive-200 shadow-sm w-36" onClick={() => setSelectedEmployee(emp)}>
                        {/* Vertical connector line up */}
                        <div className="absolute -top-6 left-1/2 -ml-px w-0.5 h-6 bg-olive-300"></div>
                        <Avatar className={cn("h-14 w-14 shadow-sm z-10 bg-white border-2", 
                          emp.role === "manager" || emp.role === "director" ? "border-olive-500" : "border-white"
                        )}>
                          <AvatarImage src={emp.profilePhotoURL} />
                          <AvatarFallback className="bg-olive-100 text-olive-700 font-bold">{getInitials(emp.fullName)}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-olive-900 mt-3 text-sm truncate w-full text-center" title={emp.fullName}>{emp.fullName}</p>
                        <p className="text-[10px] text-olive-500 text-center truncate w-full font-medium uppercase mt-0.5">{roleMeta.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto border-l border-olive-200">
          {selectedEmployee && (
            <div className="space-y-8 pb-12">
              <SheetHeader className="text-left flex flex-row items-center gap-4 border-b border-olive-100 pb-6 mt-4">
                <Avatar className="h-20 w-20 border-2 border-olive-200 shadow-md shrink-0">
                  <AvatarImage src={selectedEmployee.profilePhotoURL} />
                  <AvatarFallback className="text-2xl font-bold text-olive-700 bg-olive-50">{getInitials(selectedEmployee.fullName)}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-2xl text-olive-900">{selectedEmployee.fullName}</SheetTitle>
                  <SheetDescription className="text-olive-600 font-medium text-base">
                    {selectedEmployee.jobTitle || "No Title"}
                  </SheetDescription>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="border-olive-200 text-olive-700 bg-olive-50">
                      {ROLE_META[selectedEmployee.role]?.label || "Employee"}
                    </Badge>
                    {selectedEmployee.department && (
                      <Badge variant="outline" className="border-olive-200 text-olive-700 bg-olive-50">
                        {selectedEmployee.department}
                      </Badge>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <div className="flex gap-3">
                <Button className="flex-1 bg-olive-600 hover:bg-olive-700 text-white shadow-sm">
                  <MessageSquare className="w-4 h-4 mr-2" /> Message
                </Button>
                <Button variant="outline" className="flex-1 border-olive-300 text-olive-700 hover:bg-olive-50">
                  <Mail className="w-4 h-4 mr-2" /> Email
                </Button>
                <Link href={`/dashboard/hr/${selectedEmployee.id}`} className="flex-1 flex">
                  <Button variant="outline" className="w-full border-olive-300 text-olive-700 hover:bg-olive-50">
                    Full Profile
                  </Button>
                </Link>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-olive-900 uppercase tracking-wider mb-3">Current Status</h4>
                  <Card className="border-olive-200 shadow-sm bg-olive-50/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <div>
                          <p className="text-sm font-semibold text-olive-900">Clocked In</p>
                          <p className="text-xs text-olive-500">Since 09:00 AM AST</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-olive-900">4h 23m</p>
                        <p className="text-xs text-olive-500">Today</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-olive-900 uppercase tracking-wider mb-3 flex justify-between items-center">
                    Leave Balance
                    <span className="text-xs text-olive-500 normal-case font-normal">24 days total</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-olive-700 font-medium">Used</span>
                      <span className="text-olive-900 font-bold">8 days</span>
                    </div>
                    <div className="w-full h-3 bg-olive-100 rounded-full overflow-hidden border border-olive-200">
                      <div className="h-full bg-olive-600 rounded-full" style={{ width: `${(8/24)*100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-olive-500">Remaining</span>
                      <span className="text-olive-600 font-medium">16 days</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-olive-900 uppercase tracking-wider mb-3">Active Projects</h4>
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-olive-200 hover:bg-olive-50 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded bg-olive-100 flex items-center justify-center text-olive-600 shrink-0">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-olive-900">Al Safa Marketing</p>
                          <p className="text-xs text-olive-500">Brand Redesign</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
