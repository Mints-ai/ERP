"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Users, FileText, CheckSquare, MessageSquare, AlertCircle, Play, MoreVertical, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Helper component for circular progress
const ProgressRing = ({ progress, size = 120, strokeWidth = 8, colorClass = "text-blue-400" }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          className="text-white/10"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <motion.circle
          className={colorClass}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{progress}%</span>
      </div>
    </div>
  );
};

export default function ProjectDetail() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const unsubscribe = onSnapshot(doc(db, "projects", id as string), (docSnap) => {
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() });
      } else {
        setProject(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white rounded-xl border border-olive-200 shadow-card">
        <div className="h-16 w-16 rounded-full bg-olive-50 flex items-center justify-center mb-4 border border-olive-100">
          <FileText className="h-8 w-8 text-olive-400" />
        </div>
        <h2 className="text-xl font-bold text-olive-900">Project Not Found</h2>
        <p className="text-olive-500 mt-2">The requested project does not exist or you don't have access.</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pitch: "bg-blue-100 text-blue-700 border-blue-200",
    active: "bg-green-100 text-green-700 border-green-200",
    on_hold: "bg-yellow-100 text-yellow-700 border-yellow-200",
    completed: "bg-olive-100 text-olive-700 border-olive-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };

  // Mock progress calculation
  const progress = project.status === "completed" ? 100 : project.status === "pitch" ? 10 : 65;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Profile Card */}
      <Card className="overflow-hidden border-white/10 shadow-lg">
        <div className="h-3 bg-gradient-to-r from-blue-500 to-blue-700 animate-pulse-glow"></div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-xs uppercase tracking-wider font-bold bg-white/5 text-white/60 border-white/10">
                  {project.serviceType || "General"}
                </Badge>
                <Badge variant="outline" className={`text-xs uppercase tracking-wider font-bold shadow-none ${statusColors[project.status] || statusColors.pitch}`}>
                  {project.status?.replace("_", " ")}
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">{project.name}</h1>
              <p className="text-lg text-white/60 max-w-2xl">{project.description || "No description provided for this project."}</p>
              
              <div className="flex flex-wrap gap-6 text-sm text-white/40 mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Started: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                {project.endDate && (
                  <div className="flex items-center gap-2 text-blue-300 font-medium">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span>Deadline: {new Date(project.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress Ring */}
            <div className="shrink-0 flex flex-col items-center justify-center bg-white/[0.02] p-6 rounded-2xl border border-white/[0.06] min-w-[200px]">
              <ProgressRing progress={progress} />
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider mt-4">Project Health</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-white/5 border border-white/10 w-full justify-start h-auto p-1 overflow-x-auto flex-wrap shadow-sm rounded-xl mb-6">
              <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-lg">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-lg">Tasks</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-lg">Files</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-300 rounded-lg">Internal Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 m-0">
              <Card className="border-white/10 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Milestone Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l-2 border-white/10 ml-4 space-y-8 pb-4">
                    {/* Mock Milestones */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-[#0d1f3c]" />
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Oct 12</p>
                      <h4 className="text-sm font-bold text-white">Project Kickoff</h4>
                      <p className="text-xs text-white/60 mt-1">Initial client meeting and requirements gathering completed.</p>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-[#0d1f3c]" />
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Nov 01</p>
                      <h4 className="text-sm font-bold text-white">Design Phase Complete</h4>
                      <p className="text-xs text-white/60 mt-1">Figma files approved by client.</p>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-[#0d1f3c] border-4 border-blue-500 ring-4 ring-[#0d1f3c] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Current</p>
                      <h4 className="text-sm font-bold text-white">Development Sprint 1</h4>
                      <p className="text-xs text-white/60 mt-1">Building core frontend components.</p>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white/5 ring-4 ring-[#0d1f3c]" />
                      <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">Dec 15</p>
                      <h4 className="text-sm font-bold text-white/40">Final Delivery</h4>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {["founder", "c_suite", "manager"].includes(role || "") && project.budget && (
                <Card className="border-white/10 shadow-sm bg-white/[0.02]">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Budget Tracking</h3>
                      <span className="text-sm font-bold text-white">{parseInt(project.budget).toLocaleString()} AED</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                    <p className="text-xs text-white/40 text-right">45% Consumed</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <Card className="border-white/10 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white text-lg">Linked Tasks</h3>
                    <Badge className="bg-white/5 text-white/80 border-white/10">12 Total</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 border border-white/5 rounded-xl hover:border-white/10 transition-colors cursor-pointer group bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center group-hover:border-white/40 bg-white/[0.02]">
                            {i === 1 && <Check className="w-3 h-3 text-emerald-400" />}
                          </div>
                          <div>
                            <p className={cn("text-sm font-medium", i === 1 ? "text-white/40 line-through" : "text-white/80")}>
                              {i === 1 ? "Setup repository" : i === 2 ? "Build TopNav component" : "Integrate Firebase"}
                            </p>
                          </div>
                        </div>
                        <Avatar className="w-6 h-6 border border-white/10">
                          <AvatarFallback className="bg-white/5 text-[10px] text-white/60">S</AvatarFallback>
                        </Avatar>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="files" className="m-0">
              <Card className="border-white/10 shadow-sm">
                <CardContent className="py-12 flex flex-col items-center text-center">
                   <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                     <FileText className="h-8 w-8 text-white/30" />
                   </div>
                   <h3 className="font-bold text-white text-lg">Document Vault</h3>
                   <p className="text-white/40 mt-1 max-w-sm">Files and assets related to this project will appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Rail */}
        <div className="space-y-6">
          {/* Team Stack */}
          <Card className="border-white/10 shadow-sm">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base text-white">Project Team</CardTitle>
                <span className="text-xs font-bold text-white/40 bg-white/5 px-2 py-1 rounded-md">{project.memberIds?.length || 0}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Manager */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Lead</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-white/10 shadow-sm">
                    <AvatarFallback className="bg-white/5 text-white/60 text-xs">M</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-white/80">Manager Name</p>
                  </div>
                </div>
              </div>
              
              {/* Members */}
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Members</p>
                <div className="flex -space-x-2 overflow-hidden">
                  {[1,2,3,4].map(i => (
                    <Avatar key={i} className="inline-block border-2 border-[#0d1f3c] h-8 w-8 shadow-sm">
                      <AvatarFallback className="bg-white/5 text-white/60 text-xs">U{i}</AvatarFallback>
                    </Avatar>
                  ))}
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-[#0d1f3c] bg-white/5 text-[10px] font-medium text-white/60 shadow-sm z-10">
                    +2
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-white/10 shadow-sm">
            <CardHeader className="pb-3 border-b border-white/5">
              <CardTitle className="text-base text-white">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <div className="p-4 flex gap-3 hover:bg-white/[0.01] transition-colors">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-white/5 text-white/60 text-xs">S</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-white/80"><span className="font-bold">Sarah</span> marked <span className="font-medium text-blue-400">Design Phase Complete</span></p>
                    <p className="text-xs text-white/40 mt-1">2 hours ago</p>
                  </div>
                </div>
                <div className="p-4 flex gap-3 hover:bg-white/[0.01] transition-colors">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-white/5 text-white/60 text-xs">M</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-white/80"><span className="font-bold">Manager</span> uploaded <span className="font-medium text-blue-400">brief.pdf</span></p>
                    <p className="text-xs text-white/40 mt-1">Yesterday</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
