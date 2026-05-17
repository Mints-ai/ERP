"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search, LayoutGrid, List as ListIcon, CalendarIcon, Kanban, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { canAccess } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pitch: "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200",
  active: "bg-olive-100 text-olive-700 hover:bg-olive-200 border-olive-200",
  on_hold: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200",
  completed: "bg-green-100 text-green-700 hover:bg-green-200 border-green-200",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-200 border-red-200",
};

const SERVICE_COLORS: Record<string, string> = {
  "SEO": "bg-blue-500",
  "Development": "bg-purple-500",
  "Design": "bg-pink-500",
  "Marketing": "bg-orange-500",
  "Consulting": "bg-teal-500"
};

export default function ProjectsList() {
  const { user, role } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [managers, setManagers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "table" | "timeline">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!user || !role) return;

    let q;
    if (canAccess(role, "VIEW_ALL_FINANCE")) { 
      q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    } else {
      q = query(
        collection(db, "projects"), 
        where("memberIds", "array-contains", user.uid),
        orderBy("createdAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, role]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["pitch", "active", "on_hold", "completed"];

  return (
    <div className="space-y-6 pb-12 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-olive-900">Projects</h1>
          <p className="text-olive-600 mt-1">Manage client projects, pipelines, and timelines.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-olive-100 p-1 rounded-lg border border-olive-200 shadow-inner hidden md:flex">
            <button 
              onClick={() => setView("kanban")}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all", view === "kanban" ? "bg-white text-olive-900 shadow-sm" : "text-olive-600 hover:text-olive-900")}
            >
              <Kanban className="w-4 h-4 mr-2" /> Board
            </button>
            <button 
              onClick={() => setView("table")}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all", view === "table" ? "bg-white text-olive-900 shadow-sm" : "text-olive-600 hover:text-olive-900")}
            >
              <ListIcon className="w-4 h-4 mr-2" /> List
            </button>
            <button 
              onClick={() => setView("timeline")}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-all", view === "timeline" ? "bg-white text-olive-900 shadow-sm" : "text-olive-600 hover:text-olive-900")}
            >
              <Clock className="w-4 h-4 mr-2" /> Timeline
            </button>
          </div>
          
          <RoleGuard permission="CREATE_PROJECT">
            <Link href="/dashboard/projects/new">
              <Button className="bg-olive-600 hover:bg-olive-700 text-white shadow-md">
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </Link>
          </RoleGuard>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-olive-200 shadow-card shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-olive-400" />
          <Input
            placeholder="Search projects..."
            className="pl-10 bg-olive-50 border-olive-200 focus-visible:ring-olive-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {view !== "kanban" && (
          <div className="flex gap-4 md:w-auto">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
              <SelectTrigger className="w-[180px] bg-olive-50 border-olive-200 focus:ring-olive-500">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pitch">Pitch</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-xl border border-olive-200 border-dashed">
          <h3 className="text-lg font-medium text-olive-900">No projects found</h3>
          <p className="text-sm text-olive-500 mt-1">Create a new project or adjust your filters.</p>
        </div>
      ) : view === "kanban" ? (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max h-full">
            {statuses.map(status => {
              const columnProjects = filteredProjects.filter(p => p.status === status);
              return (
                <div key={status} className="w-80 flex flex-col bg-olive-50/50 rounded-xl border border-olive-100 p-4 shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-olive-900 uppercase tracking-wider text-sm flex items-center">
                      <span className={cn("w-2 h-2 rounded-full mr-2", 
                        status === "active" ? "bg-olive-500" : 
                        status === "pitch" ? "bg-blue-400" : 
                        status === "completed" ? "bg-green-500" : "bg-yellow-500"
                      )} />
                      {status.replace("_", " ")}
                    </h3>
                    <Badge variant="secondary" className="bg-white text-olive-600">{columnProjects.length}</Badge>
                  </div>
                  
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    <AnimatePresence>
                      {columnProjects.map(project => {
                        const serviceColor = SERVICE_COLORS[project.serviceType] || "bg-olive-500";
                        return (
                          <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={project.id}
                          >
                            <Link href={`/dashboard/projects/${project.id}`}>
                              <Card className="hover:shadow-md transition-all cursor-pointer border-olive-200 hover:border-olive-300 overflow-hidden relative group">
                                {/* Left Color Strip */}
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1", serviceColor)} />
                                
                                <CardContent className="p-4 pl-5">
                                  <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="text-[10px] font-normal uppercase bg-olive-50 text-olive-600 border-olive-200">
                                      {project.serviceType || "General"}
                                    </Badge>
                                    <div className={cn("w-2 h-2 rounded-full", 
                                      status === "active" ? "bg-green-500" : "bg-gray-300"
                                    )} title="Project Health" />
                                  </div>
                                  
                                  <h4 className="font-bold text-olive-900 line-clamp-2 leading-tight mb-3 group-hover:text-olive-700 transition-colors">
                                    {project.name}
                                  </h4>
                                  
                                  <div className="flex items-center justify-between pt-3 border-t border-olive-100">
                                    <div className="flex items-center gap-1.5 text-xs text-olive-500">
                                      <CalendarIcon className="h-3 w-3" />
                                      {project.endDate ? new Date(project.endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : 'No date'}
                                    </div>
                                    <Avatar className="h-6 w-6 border border-white shadow-sm">
                                      <AvatarFallback className="bg-olive-200 text-olive-700 text-[10px] font-bold">M</AvatarFallback>
                                    </Avatar>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {columnProjects.length === 0 && (
                      <div className="h-24 rounded-lg border-2 border-dashed border-olive-200 flex items-center justify-center text-sm text-olive-400 italic">
                        Empty
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "table" ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-olive-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-olive-50 text-olive-700 text-xs uppercase font-semibold border-b border-olive-200">
                <tr>
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-100">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-olive-50/50 cursor-pointer transition-colors" 
                      onClick={() => window.location.href = `/dashboard/projects/${project.id}`}>
                    <td className="px-6 py-4 font-bold text-olive-900">
                      <div className="flex items-center">
                        <div className={cn("w-1.5 h-1.5 rounded-full mr-3", SERVICE_COLORS[project.serviceType] || "bg-olive-500")} />
                        {project.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-olive-600">{clients[project.clientId] || "Mints Global Client"}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={`font-medium shadow-none ${STATUS_COLORS[project.status] || STATUS_COLORS.pitch}`}>
                        {project.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-olive-600">{project.serviceType}</td>
                    <td className="px-6 py-4 text-olive-600">
                      {project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        /* Timeline / Gantt View Mock */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border border-olive-200 shadow-card p-6 overflow-x-auto flex-1">
          <div className="min-w-[800px]">
            {/* Timeline Header - Months */}
            <div className="flex border-b border-olive-200 pb-2 mb-6 ml-48">
              {['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map(m => (
                <div key={m} className="flex-1 text-xs font-bold text-olive-500 uppercase tracking-wider pl-2">{m}</div>
              ))}
            </div>
            
            {/* Project Rows */}
            <div className="space-y-6">
              {filteredProjects.slice(0, 10).map((project, idx) => {
                const serviceColor = SERVICE_COLORS[project.serviceType] || "bg-olive-500";
                // Mock random lengths and positions for the timeline visualization
                const startMargin = `${(idx % 4) * 15}%`;
                const width = `${20 + (idx % 3) * 15}%`;
                
                return (
                  <div key={project.id} className="flex items-center group cursor-pointer" onClick={() => window.location.href = `/dashboard/projects/${project.id}`}>
                    <div className="w-48 shrink-0 pr-4">
                      <p className="text-sm font-semibold text-olive-900 truncate group-hover:text-olive-600 transition-colors">{project.name}</p>
                      <p className="text-xs text-olive-400 truncate">{project.serviceType}</p>
                    </div>
                    <div className="flex-1 relative h-8 bg-olive-50 rounded-md overflow-hidden">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="flex-1 border-l border-olive-100" />)}
                      </div>
                      {/* The bar */}
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width }}
                        className={cn("absolute top-1 bottom-1 rounded-full shadow-sm flex items-center px-3", serviceColor)}
                        style={{ left: startMargin }}
                      >
                        <span className="text-[10px] text-white font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {project.status === "completed" ? "100%" : `${40 + (idx * 5)}%`}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
