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
const ProgressRing = ({ progress, size = 120, strokeWidth = 8, colorClass = "text-olive-600" }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background circle */}
        <circle
          className="text-olive-100"
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
        <span className="text-2xl font-bold text-olive-900">{progress}%</span>
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
      <Card className="overflow-hidden border-olive-200 shadow-card">
        <div className="h-3 bg-gradient-to-r from-olive-400 to-olive-600"></div>
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-xs uppercase tracking-wider font-bold bg-olive-50 text-olive-600 border-olive-200">
                  {project.serviceType || "General"}
                </Badge>
                <Badge variant="outline" className={`text-xs uppercase tracking-wider font-bold shadow-none ${statusColors[project.status] || statusColors.pitch}`}>
                  {project.status?.replace("_", " ")}
                </Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-olive-900 mb-2">{project.name}</h1>
              <p className="text-lg text-olive-600 max-w-2xl">{project.description || "No description provided for this project."}</p>
              
              <div className="flex flex-wrap gap-6 text-sm text-olive-500 mt-6 pt-6 border-t border-olive-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Started: {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                {project.endDate && (
                  <div className="flex items-center gap-2 text-olive-700 font-medium">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <span>Deadline: {new Date(project.endDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress Ring */}
            <div className="shrink-0 flex flex-col items-center justify-center bg-olive-50/50 p-6 rounded-2xl border border-olive-100 min-w-[200px]">
              <ProgressRing progress={progress} />
              <p className="text-xs font-bold text-olive-500 uppercase tracking-wider mt-4">Project Health</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-white border border-olive-200 w-full justify-start h-auto p-1 overflow-x-auto flex-wrap shadow-sm rounded-lg mb-6">
              <TabsTrigger value="overview" className="data-[state=active]:bg-olive-100 data-[state=active]:text-olive-900 rounded-md">Overview</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-olive-100 data-[state=active]:text-olive-900 rounded-md">Tasks</TabsTrigger>
              <TabsTrigger value="files" className="data-[state=active]:bg-olive-100 data-[state=active]:text-olive-900 rounded-md">Files</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-olive-100 data-[state=active]:text-olive-900 rounded-md">Internal Notes</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6 m-0">
              <Card className="border-olive-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-olive-900">Milestone Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative border-l-2 border-olive-100 ml-4 space-y-8 pb-4">
                    {/* Mock Milestones */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white" />
                      <p className="text-xs font-bold text-olive-400 uppercase tracking-wider mb-1">Oct 12</p>
                      <h4 className="text-sm font-bold text-olive-900">Project Kickoff</h4>
                      <p className="text-xs text-olive-600 mt-1">Initial client meeting and requirements gathering completed.</p>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white" />
                      <p className="text-xs font-bold text-olive-400 uppercase tracking-wider mb-1">Nov 01</p>
                      <h4 className="text-sm font-bold text-olive-900">Design Phase Complete</h4>
                      <p className="text-xs text-olive-600 mt-1">Figma files approved by client.</p>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white border-4 border-olive-500 ring-4 ring-white flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-olive-500 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xs font-bold text-olive-600 uppercase tracking-wider mb-1">Current</p>
                      <h4 className="text-sm font-bold text-olive-900">Development Sprint 1</h4>
                      <p className="text-xs text-olive-600 mt-1">Building core frontend components.</p>
                    </div>
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-olive-100 ring-4 ring-white" />
                      <p className="text-xs font-bold text-olive-400 uppercase tracking-wider mb-1">Dec 15</p>
                      <h4 className="text-sm font-bold text-olive-400">Final Delivery</h4>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {["founder", "c_suite", "manager"].includes(role || "") && project.budget && (
                <Card className="border-olive-200 shadow-sm bg-olive-50">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-bold text-olive-900 uppercase tracking-wider">Budget Tracking</h3>
                      <span className="text-sm font-bold text-olive-900">{parseInt(project.budget).toLocaleString()} AED</span>
                    </div>
                    <div className="w-full h-2 bg-olive-200 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-olive-600 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                    <p className="text-xs text-olive-600 text-right">45% Consumed</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="m-0">
              <Card className="border-olive-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-olive-900 text-lg">Linked Tasks</h3>
                    <Badge className="bg-olive-100 text-olive-700 hover:bg-olive-200">12 Total</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between p-3 border border-olive-100 rounded-lg hover:border-olive-300 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded border border-olive-300 flex items-center justify-center group-hover:border-olive-500">
                            {i === 1 && <Check className="w-3 h-3 text-olive-500" />}
                          </div>
                          <div>
                            <p className={cn("text-sm font-medium", i === 1 ? "text-olive-400 line-through" : "text-olive-900")}>
                              {i === 1 ? "Setup repository" : i === 2 ? "Build TopNav component" : "Integrate Firebase"}
                            </p>
                          </div>
                        </div>
                        <Avatar className="w-6 h-6 border border-olive-200">
                          <AvatarFallback className="bg-olive-50 text-[10px] text-olive-600">S</AvatarFallback>
                        </Avatar>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="files" className="m-0">
              <Card className="border-olive-200 shadow-sm">
                <CardContent className="py-12 flex flex-col items-center text-center">
                   <div className="h-16 w-16 bg-olive-50 rounded-full flex items-center justify-center mb-4">
                     <FileText className="h-8 w-8 text-olive-400" />
                   </div>
                   <h3 className="font-bold text-olive-900 text-lg">Document Vault</h3>
                   <p className="text-olive-500 mt-1 max-w-sm">Files and assets related to this project will appear here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Rail */}
        <div className="space-y-6">
          {/* Team Stack */}
          <Card className="border-olive-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-olive-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base text-olive-900">Project Team</CardTitle>
                <span className="text-xs font-bold text-olive-400 bg-olive-50 px-2 py-1 rounded-md">{project.memberIds?.length || 0}</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Manager */}
              <div>
                <p className="text-[10px] font-bold text-olive-400 uppercase tracking-wider mb-2">Lead</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border border-olive-200 shadow-sm">
                    <AvatarFallback className="bg-olive-100 text-olive-700 text-xs">M</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-olive-900">Manager Name</p>
                  </div>
                </div>
              </div>
              
              {/* Members */}
              <div>
                <p className="text-[10px] font-bold text-olive-400 uppercase tracking-wider mb-2">Members</p>
                <div className="flex -space-x-2 overflow-hidden">
                  {[1,2,3,4].map(i => (
                    <Avatar key={i} className="inline-block border-2 border-white h-8 w-8 shadow-sm">
                      <AvatarFallback className="bg-olive-50 text-olive-600 text-xs">U{i}</AvatarFallback>
                    </Avatar>
                  ))}
                  <div className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-white bg-olive-100 text-[10px] font-medium text-olive-600 shadow-sm z-10">
                    +2
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-olive-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-olive-100">
              <CardTitle className="text-base text-olive-900">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-olive-100">
                <div className="p-4 flex gap-3 hover:bg-olive-50/50 transition-colors">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-olive-100 text-olive-600 text-xs">S</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-olive-900"><span className="font-bold">Sarah</span> marked <span className="font-medium text-olive-600">Design Phase Complete</span></p>
                    <p className="text-xs text-olive-400 mt-1">2 hours ago</p>
                  </div>
                </div>
                <div className="p-4 flex gap-3 hover:bg-olive-50/50 transition-colors">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-olive-100 text-olive-600 text-xs">M</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-olive-900"><span className="font-bold">Manager</span> uploaded <span className="font-medium text-olive-600">brief.pdf</span></p>
                    <p className="text-xs text-olive-400 mt-1">Yesterday</p>
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
