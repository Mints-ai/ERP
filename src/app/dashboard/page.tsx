"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, Users, CheckCircle2, Clock, Check, X, AlertCircle, Heart, Zap } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const taskData = [{ v: 5 }, { v: 8 }, { v: 6 }, { v: 12 }, { v: 8 }, { v: 14 }];
const projData = [{ v: 2 }, { v: 4 }, { v: 3 }, { v: 6 }, { v: 5 }, { v: 7 }];
const teamData = [{ v: 3 }, { v: 5 }, { v: 8 }, { v: 12 }, { v: 15 }, { v: 18 }];
const hoursData = [{ v: 20 }, { v: 35 }, { v: 42 }, { v: 38 }, { v: 45 }, { v: 40 }];

// Realistic Attendance Heatmap Data (12 weeks, 5 days a week)
// 0: absent, 1: half-day/late, 2: present, 3: overtime
const heatmapData: number[][] = [
  [2, 2, 2, 2, 2], [2, 2, 0, 2, 2], [2, 2, 2, 2, 1], [2, 2, 3, 2, 2],
  [2, 0, 2, 2, 2], [2, 2, 2, 1, 2], [2, 2, 2, 2, 2], [3, 2, 2, 2, 2],
  [2, 2, 2, 2, 0], [2, 1, 2, 2, 2], [2, 2, 2, 3, 2], [2, 2, 2, 2, 2]
];

export default function DashboardHome() {
  const { user, role } = useAuth();
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [newShoutout, setNewShoutout] = useState("");
  const [isSubmittingShoutout, setIsSubmittingShoutout] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Draggable Widget State
  const [widgetOrder, setWidgetOrder] = useState(["presence", "shoutouts", "announcements", "heatmap"]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("dashboard_widget_order");
    if (saved) {
      try { setWidgetOrder(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const items = Array.from(widgetOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setWidgetOrder(items);
    localStorage.setItem("dashboard_widget_order", JSON.stringify(items));
  };
  const [stats, setStats] = useState({
    openTasks: 0,
    activeProjects: 0,
    teamSize: 0,
    onlineCount: 0,
    pendingLeaves: 0,
    pendingApprovals: [] as any[]
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const isExecutive = role === "founder" || role === "system_admin" || role === "c_suite" || role === "manager";

  useEffect(() => {
    if (!user) return;
    
    const loadStats = async () => {
      try {
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        
        // 2. Open Tasks
        const tasksSnap = await getDocs(collection(db, "tasks"));
        const taskCount = tasksSnap.docs.filter(doc => doc.data().status !== "completed").length;
        
        // 3. Active Projects Count
        const projectsSnap = await getDocs(query(collection(db, "projects")));
        const projectCount = projectsSnap.size;
        
        // 4. Pending Leaves List & Count
        const leavesSnap = await getDocs(query(collection(db, "leaves"), where("status", "==", "pending")));
        const leaveCount = leavesSnap.size;
        const approvals = leavesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setStats(prev => ({
          ...prev,
          openTasks: taskCount,
          activeProjects: projectCount,
          pendingLeaves: leaveCount,
          pendingApprovals: approvals
        }));
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStats();
    
    let unsubShoutouts = () => {};
    let unsubEmployees = () => {};

    // Listen to Shoutouts in real-time
    import("firebase/firestore").then(({ collection, query, orderBy, limit, onSnapshot }) => {
      const q = query(collection(db, "shoutouts"), orderBy("createdAt", "desc"), limit(5));
      unsubShoutouts = onSnapshot(q, (snapshot) => {
        setShoutouts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (error) => {
        console.error("Firestore onSnapshot error (shoutouts):", error);
      });
    });

    // Listen to Employees for dynamic presence updates
    import("firebase/firestore").then(({ collection, query, onSnapshot }) => {
      const q = query(collection(db, "employees"));
      unsubEmployees = onSnapshot(q, (snapshot) => {
        const emps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setEmployees(emps);
        
        const now = Date.now();
        const activeCount = emps.filter((emp: any) => emp.isActive && emp.lastSeenAt && (now - new Date(emp.lastSeenAt).getTime() < 5 * 60 * 1000)).length;
        
        setStats(prev => ({
          ...prev,
          teamSize: emps.filter((e: any) => e.isActive).length,
          onlineCount: activeCount
        }));
      }, (error) => {
        console.error("Firestore onSnapshot error (presence employees):", error);
      });
    });

    return () => {
      unsubShoutouts();
      unsubEmployees();
    };
  }, [user]);

  const handleAction = async (id: string, newStatus: "approved" | "rejected") => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      await updateDoc(doc(db, "leaves", id), {
        status: newStatus,
        approvedBy: user?.displayName || "System Administrator",
        updatedAt: new Date().toISOString()
      });
      setStats(prev => ({
        ...prev,
        pendingLeaves: Math.max(0, prev.pendingLeaves - 1),
        pendingApprovals: prev.pendingApprovals.filter(a => a.id !== id)
      }));
    } catch (err) {
      console.error("Error updating leave request:", err);
    }
  };

  const handlePostShoutout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoutout.trim() || !user) return;
    
    setIsSubmittingShoutout(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(db, "shoutouts"), {
        text: newShoutout,
        authorId: user.uid,
        authorName: user.fullName || user.displayName || "Team Member",
        createdAt: serverTimestamp()
      });
      setNewShoutout("");
    } catch (err) {
      console.error("Error posting shoutout:", err);
    }
    setIsSubmittingShoutout(false);
  };

  return (
    <div className="flex gap-6 h-full min-h-screen pb-24 text-foreground">
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary fill-primary/10 animate-pulse" />
            {isExecutive ? "Command Center" : "My Workspace"}
          </h1>
          <p className="text-sm text-foreground/60 mt-1">
            {isExecutive 
              ? "Here is the top-level activity and operational health for Mints Global."
              : `Welcome back, ${user?.displayName?.split(" ")[0] || "User"}. Here's what's on your desk today.`}
          </p>
        </div>

        {/* Sparkline Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden group border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
              <CardTitle className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Open Tasks</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="z-10 relative pb-8">
              {stats.openTasks > 0 ? (
                <div className="stat-number">{stats.openTasks}</div>
              ) : (
                <div className="text-3xl font-light text-muted-foreground/30 border-2 border-dashed border-border/50 rounded-lg px-4 py-1 inline-block">0</div>
              )}
              <p className="text-xs text-foreground/50 mt-1">Live operational tasks</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-14 opacity-20 group-hover:opacity-40 transition-opacity">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={taskData}>
                    <defs>
                      <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#708238" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#708238" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#708238" fillOpacity={1} fill="url(#colorTasks)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </Card>

          {isExecutive && (
            <>
              <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden group border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                  <CardTitle className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Active Projects</CardTitle>
                  <Briefcase className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent className="z-10 relative pb-8">
                  {stats.activeProjects > 0 ? (
                    <div className="stat-number">{stats.activeProjects}</div>
                  ) : (
                    <div className="text-3xl font-light text-muted-foreground/30 border-2 border-dashed border-border/50 rounded-lg px-4 py-1 inline-block">0</div>
                  )}
                  <p className="text-xs text-foreground/50 mt-1">Actively loaded projects</p>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-14 opacity-20 group-hover:opacity-40 transition-opacity">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projData}>
                        <Line type="monotone" dataKey="v" stroke="#8fa87b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>
              </Card>

              <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden group border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                  <CardTitle className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Team Size</CardTitle>
                  <Users className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent className="z-10 relative pb-8">
                  <div className="flex items-baseline gap-2">
                    {stats.teamSize > 0 ? (
                      <div className="stat-number">{stats.teamSize}</div>
                    ) : (
                      <div className="text-3xl font-light text-muted-foreground/30 border-2 border-dashed border-border/50 rounded-lg px-4 py-1 inline-block">0</div>
                    )}
                    {stats.onlineCount > 0 && (
                      <span className="text-xs text-primary font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {stats.onlineCount} Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/50 mt-1">Onboarded employees</p>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-14 opacity-20 group-hover:opacity-40 transition-opacity">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={teamData}>
                        <defs>
                          <linearGradient id="colorTeam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#708238" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#708238" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="step" dataKey="v" stroke="#708238" fillOpacity={1} fill="url(#colorTeam)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>
              </Card>
            </>
          )}

          <Card className="bg-card border border-border shadow-sm rounded-lg overflow-hidden group border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
              <CardTitle className="text-xs font-bold text-foreground/60 uppercase tracking-wider">Hours Logged</CardTitle>
              <Clock className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="z-10 relative pb-8">
              <div className="stat-number">0<span className="text-sm text-foreground/40 font-sans ml-0.5">h</span></div>
              <p className="text-xs text-foreground/50 mt-1">Current operational week</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-14 opacity-20 group-hover:opacity-40 transition-opacity">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hoursData}>
                    <Line type="monotone" dataKey="v" stroke="#8fa87b" strokeWidth={2} dot={{ r: 2, fill: "#8fa87b" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </Card>
        </div>

        {/* DRAGGABLE WIDGETS AREA */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dashboard-widgets">
            {(provided) => (
              <div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-6" 
                {...provided.droppableProps} 
                ref={provided.innerRef}
              >
                {widgetOrder.map((widgetId, index) => (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex flex-col ${snapshot.isDragging ? "z-50 shadow-2xl ring-2 ring-primary rounded-xl" : ""}`}
                      >
                        {/* Drag Handle Bar */}
                        <div 
                          {...provided.dragHandleProps} 
                          className="h-6 flex items-center justify-center bg-secondary/50 rounded-t-xl border border-b-0 border-border opacity-0 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                        >
                          <div className="w-8 h-1 bg-foreground/20 rounded-full" />
                        </div>

                        {widgetId === "presence" && (
                          <Card className="bg-card border border-border shadow-sm flex-1 rounded-t-none">
                            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                              <div>
                                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                  </span>
                                  Live Presence Map
                                </CardTitle>
                                <CardDescription className="text-xs text-foreground/50 mt-1">Real-time status updates.</CardDescription>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 h-[300px] overflow-y-auto">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {employees.map(emp => {
                                  const now = Date.now();
                                  let status = "offline";
                                  if (emp.lastSeenAt) {
                                    if (now - new Date(emp.lastSeenAt).getTime() < 5 * 60 * 1000) status = "online";
                                    else if (now - new Date(emp.lastSeenAt).getTime() < 15 * 60 * 1000) status = "idle";
                                  }
                                  return (
                                    <div key={emp.id} className="border border-border p-3 rounded-xl flex items-center gap-3">
                                      <Avatar className="h-10 w-10 border border-border/30">
                                        <AvatarImage src={emp.profilePhotoURL} />
                                        <AvatarFallback className="bg-primary/30 text-sm">{(emp.fullName||"").substring(0,2)}</AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">{emp.fullName}</p>
                                        <p className="text-xs text-foreground/50 truncate mt-0.5">{status === "online" ? "Active Now" : "Offline"}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {widgetId === "shoutouts" && (
                          <Card className="bg-card border border-border shadow-sm flex-1 rounded-t-none flex flex-col">
                            <CardHeader className="pb-3 border-b border-border">
                              <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Heart className="h-5 w-5 text-red-400" /> Team Shoutouts
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 h-[300px] overflow-y-auto flex flex-col gap-4">
                              <form onSubmit={handlePostShoutout} className="flex gap-2">
                                <Input 
                                  placeholder="Give a shoutout..." 
                                  value={newShoutout}
                                  onChange={(e) => setNewShoutout(e.target.value)}
                                  className="h-9 text-xs"
                                />
                                <button type="submit" disabled={!newShoutout.trim()} className="btn-primary h-9 px-4 text-xs">Post</button>
                              </form>
                              <div className="space-y-2">
                                {shoutouts.map((shout: any) => (
                                  <div key={shout.id} className="p-3 rounded-xl border border-border shadow-sm border-l-4 border-l-accent">
                                    <p className="text-sm">"{shout.text}"</p>
                                    <p className="text-xs text-accent mt-2 font-bold">— {shout.authorName}</p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {widgetId === "announcements" && (
                          <Card className="bg-card border border-border shadow-sm flex-1 rounded-t-none">
                            <CardHeader className="pb-4 border-b border-border">
                              <CardTitle className="text-base font-bold flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-primary" /> Notice Board
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 h-[300px] overflow-y-auto">
                              <div className="p-4 rounded-xl border border-border border-l-4 border-l-primary">
                                <p className="font-bold text-sm">Q3 Planning Meeting</p>
                                <p className="text-xs mt-1.5">Tomorrow at 10:00 AM AST.</p>
                              </div>
                              <div className="p-4 rounded-xl border border-border border-l-4 border-l-accent">
                                <p className="font-bold text-sm">New Client Onboarding</p>
                                <p className="text-xs mt-1.5">Welcome Al Safa Group.</p>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {widgetId === "heatmap" && (
                          <Card className="bg-card border border-border shadow-sm flex-1 rounded-t-none">
                            <CardHeader className="pb-4 border-b border-border">
                              <CardTitle className="text-base font-bold">Attendance Heatmap</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 h-[300px] flex items-center justify-center">
                               <div className="flex gap-1.5 overflow-x-auto pb-2">
                                {heatmapData.map((week, wi) => (
                                  <div key={wi} className="flex flex-col gap-1.5 shrink-0">
                                    {week.map((day, di) => (
                                      <div
                                        key={di}
                                        className={cn(
                                          "w-4 h-4 rounded-[3px] border border-border/50 transition-colors",
                                          day === 0 ? "bg-muted hover:bg-muted/80" :
                                          day === 1 ? "bg-primary/40 hover:bg-primary/50" :
                                          day === 2 ? "bg-primary/80 hover:bg-primary/90" :
                                          "bg-primary hover:bg-primary shadow-[0_0_8px_rgba(112,130,56,0.6)]"
                                        )}
                                        title={["Absent", "Late/Half-day", "Present", "Overtime"][day]}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* RIGHT RAIL - PENDING APPROVALS */}
      {isExecutive && (
        <div className="hidden xl:block w-72 shrink-0">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Approvals</h3>
              <Badge className="bg-primary/20 text-primary border border-primary/20 font-mono text-xs px-2 py-0.5">{stats.pendingLeaves} tasks</Badge>
            </div>

            <div className="space-y-4 mt-4">
              {stats.pendingApprovals.length === 0 ? (
                <div className="text-center py-10 text-foreground/40 border border-border rounded-2xl text-xs font-semibold tracking-wide uppercase">
                  🎉 All Caught Up!
                </div>
              ) : (
                stats.pendingApprovals.map((approval) => (
                  <div key={approval.id} className="p-5 rounded-xl border border-border shadow-sm relative group hover: transition-all">
                    <div className="absolute inset-0 border border-primary/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none" />
                    <div className="flex items-center justify-between mb-3">
                      <span className="badge status-pending font-bold text-xs py-1 px-2 uppercase tracking-wide">
                        {approval.leaveType || "Leave Request"}
                      </span>
                      <span className="text-xs font-mono text-foreground/40">
                        {approval.createdAt ? new Date(approval.createdAt).toLocaleDateString() : "Pending"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground leading-tight">{approval.employeeName || "Mints Team Member"}</p>
                    <p className="text-xs text-foreground/50 mt-2 leading-relaxed">
                      {approval.startDate} to {approval.endDate}
                    </p>
                    <p className="text-xs italic text-accent mt-2 leading-snug p-2 rounded-md border border-border">
                      "{approval.reason || "No reason provided"}"
                    </p>
                    <div className="flex gap-2 mt-3.5">
                      <button 
                        onClick={() => handleAction(approval.id, "approved")}
                        className="flex-grow btn-primary py-1 px-3 text-xs h-7 font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button 
                        onClick={() => handleAction(approval.id, "rejected")}
                        className="flex-grow btn-ghost py-1 px-3 text-xs h-7 font-semibold flex items-center justify-center gap-1 border-border/30 hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/5 cursor-pointer"
                      >
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
