"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, Users, CheckCircle2, Clock, Check, X, AlertCircle, Heart } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, AreaChart, Area } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// Mock data for sparklines
const taskData = [ { v: 4 }, { v: 7 }, { v: 3 }, { v: 8 }, { v: 12 }, { v: 9 }, { v: 14 } ];
const projData = [ { v: 5 }, { v: 5 }, { v: 6 }, { v: 6 }, { v: 7 }, { v: 8 }, { v: 8 } ];
const teamData = [ { v: 20 }, { v: 22 }, { v: 22 }, { v: 23 }, { v: 24 }, { v: 24 }, { v: 24 } ];
const hoursData = [ { v: 6 }, { v: 7.5 }, { v: 8 }, { v: 7 }, { v: 8.5 }, { v: 6 }, { v: 8 } ];

// Mock Attendance Heatmap Data (Last 12 weeks, 5 days a week)
const generateHeatmap = () => {
  const weeks = [];
  for (let w = 0; w < 12; w++) {
    const days = [];
    for (let d = 0; d < 5; d++) {
      // 0: absent, 1: half-day/late, 2: present, 3: overtime
      const status = Math.random() > 0.9 ? 0 : Math.random() > 0.8 ? 1 : Math.random() > 0.7 ? 3 : 2;
      days.push(status);
    }
    weeks.push(days);
  }
  return weeks;
};
const heatmapData = generateHeatmap();

export default function DashboardHome() {
  const { user, role } = useAuth();
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [newShoutout, setNewShoutout] = useState("");
  const [isSubmittingShoutout, setIsSubmittingShoutout] = useState(false);
  
  const isExecutive = role === "founder" || role === "c_suite" || role === "manager";
  const isIntern = role === "intern";

  useEffect(() => {
    if (!user) return;
    import("firebase/firestore").then(({ collection, query, orderBy, limit, onSnapshot }) => {
      const q = query(collection(db, "shoutouts"), orderBy("createdAt", "desc"), limit(5));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setShoutouts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return unsubscribe;
    });
  }, [user]);

  const handlePostShoutout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoutout.trim() || !user) return;
    
    setIsSubmittingShoutout(true);
    try {
      const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(db, "shoutouts"), {
        text: newShoutout,
        authorId: user.uid,
        authorName: user.displayName || "Team Member",
        createdAt: serverTimestamp()
      });
      setNewShoutout("");
    } catch (err) {
      console.error("Error posting shoutout:", err);
    }
    setIsSubmittingShoutout(false);
  };

  return (
    <div className="flex gap-6 h-full min-h-screen pb-24">
      {/* MAIN CONTENT AREA */}
      <div className="flex-1 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-olive-900">
            {isExecutive ? "Company Overview" : "My Workspace"}
          </h1>
          <p className="text-olive-600 mt-1">
            {isExecutive 
              ? "Here is the top-level activity and operational health for Mints Global."
              : `Welcome back, ${user?.displayName?.split(" ")[0] || "User"}. Here's what's on your desk today.`}
          </p>
        </div>

        {/* Sparkline Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card hover-lift relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-olive-700">Open Tasks</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-olive-500" />
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold text-olive-900">12</div>
              <p className="text-xs text-olive-500">3 due today</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={taskData}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B7C4B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6B7C4B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#6B7C4B" fillOpacity={1} fill="url(#colorTasks)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {isExecutive && (
            <>
              <Card className="glass-card hover-lift relative overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                  <CardTitle className="text-sm font-medium text-olive-700">Active Projects</CardTitle>
                  <Briefcase className="h-4 w-4 text-olive-500" />
                </CardHeader>
                <CardContent className="z-10 relative">
                  <div className="text-2xl font-bold text-olive-900">8</div>
                  <p className="text-xs text-olive-500">+2 from last month</p>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-100 transition-opacity">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projData}>
                      <Line type="monotone" dataKey="v" stroke="#8A9B6A" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="glass-card hover-lift relative overflow-hidden group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
                  <CardTitle className="text-sm font-medium text-olive-700">Team Size</CardTitle>
                  <Users className="h-4 w-4 text-olive-500" />
                </CardHeader>
                <CardContent className="z-10 relative">
                  <div className="text-2xl font-bold text-olive-900">24</div>
                  <p className="text-xs text-olive-500">2 on leave today</p>
                </CardContent>
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-100 transition-opacity">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={teamData}>
                      <defs>
                        <linearGradient id="colorTeam" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4E5D35" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#4E5D35" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="step" dataKey="v" stroke="#4E5D35" fillOpacity={1} fill="url(#colorTeam)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          <Card className="glass-card hover-lift relative overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-olive-700">Hours Logged</CardTitle>
              <Clock className="h-4 w-4 text-olive-500" />
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-2xl font-bold text-olive-900">32.5h</div>
              <p className="text-xs text-olive-500">This week</p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hoursData}>
                  <Line type="monotone" dataKey="v" stroke="#B0C485" strokeWidth={2} dot={{ r: 2, fill: "#B0C485" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 h-auto">
          {/* Recent Activity / Tasks */}
          <div className="col-span-4 space-y-6 flex flex-col">
            <Card className="glass-card hover-lift">
              <CardHeader className="pb-3 border-b border-olive-100">
                <CardTitle className="text-lg text-olive-900">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-olive-100">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-4 p-4 hover:bg-olive-50/50 transition-colors">
                      <div className="mt-1 bg-olive-100 p-2 rounded-full">
                        <Briefcase className="h-4 w-4 text-olive-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-olive-900">Updated "Q4 Marketing Assets"</p>
                        <p className="text-xs text-olive-500 mt-1">Sarah attached 3 new Figma files to the project.</p>
                      </div>
                      <span className="text-[10px] uppercase text-olive-400 font-medium whitespace-nowrap">{i}h ago</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* TEAM SHOUTOUTS */}
            <Card className="glass-card hover-lift flex-1 flex flex-col">
              <CardHeader className="pb-3 border-b border-olive-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg text-olive-900 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" /> Team Shoutouts
                  </CardTitle>
                  <CardDescription>Recognize your peers for great work</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 flex-1 flex flex-col gap-4 bg-olive-50/30">
                <form onSubmit={handlePostShoutout} className="flex gap-2">
                  <Input 
                    placeholder="Give a shoutout to someone..." 
                    value={newShoutout}
                    onChange={(e) => setNewShoutout(e.target.value)}
                    className="bg-white"
                  />
                  <Button type="submit" disabled={isSubmittingShoutout || !newShoutout.trim()} className="bg-olive-600 hover:bg-olive-700 text-white shrink-0">
                    Post
                  </Button>
                </form>
                
                <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
                  {shoutouts.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">No shoutouts yet. Be the first!</div>
                  ) : (
                    shoutouts.map((shout: any) => (
                      <div key={shout.id} className="bg-white p-3 rounded-lg border border-olive-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-400 to-orange-400"></div>
                        <p className="text-sm text-olive-900 font-medium leading-relaxed pl-2">"{shout.text}"</p>
                        <p className="text-xs text-olive-500 mt-2 pl-2 flex justify-between">
                          <span>— {shout.authorName}</span>
                          <span>{shout.createdAt ? new Date(shout.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-3 space-y-6 flex flex-col">
            {/* Announcements */}
            <Card className="glass-card hover-lift overflow-hidden">
              <CardHeader className="bg-olive-900 text-white pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-olive-300" />
                  Notice Board
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-olive-50/50 space-y-3 h-[180px] overflow-y-auto">
                <div className="p-3 bg-white rounded-lg border border-olive-200 shadow-sm border-l-4 border-l-olive-600 hover:shadow-md transition-shadow">
                  <p className="font-semibold text-sm text-olive-900">Q3 Planning Meeting</p>
                  <p className="text-xs text-olive-600 mt-1">Tomorrow at 10:00 AM AST. All department heads must attend.</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-olive-200 shadow-sm border-l-4 border-l-olive-400 hover:shadow-md transition-shadow">
                  <p className="font-semibold text-sm text-olive-900">New Client Onboarding</p>
                  <p className="text-xs text-olive-600 mt-1">Please welcome Al Safa Group to the SEO portfolio.</p>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Heatmap */}
            <Card className="glass-card hover-lift flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-olive-900">Attendance Heatmap</CardTitle>
                <CardDescription className="text-xs">Your activity over the last 12 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1 overflow-x-auto pb-2">
                  {heatmapData.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                      {week.map((day, dIdx) => {
                        let colorClass = "bg-olive-100"; // absent/weekend
                        if (day === 1) colorClass = "bg-olive-300"; // late/half-day
                        if (day === 2) colorClass = "bg-olive-500"; // present
                        if (day === 3) colorClass = "bg-olive-700"; // overtime
                        
                        return (
                          <div 
                            key={dIdx} 
                            className={`w-3 h-3 rounded-sm ${colorClass} hover:ring-2 ring-olive-900 cursor-help transition-all`}
                            title={`Status level: ${day}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-olive-500 font-medium">
                  <span>Less</span>
                  <div className="w-3 h-3 rounded-sm bg-olive-100" />
                  <div className="w-3 h-3 rounded-sm bg-olive-300" />
                  <div className="w-3 h-3 rounded-sm bg-olive-500" />
                  <div className="w-3 h-3 rounded-sm bg-olive-700" />
                  <span>More</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* RIGHT RAIL - PENDING APPROVALS */}
      {isExecutive && (
        <div className="hidden xl:block w-80 shrink-0">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-olive-200">
              <h3 className="font-bold text-olive-900 tracking-tight">Pending Approvals</h3>
              <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200">4 actions</Badge>
            </div>

            <div className="space-y-3">
              {/* Approval Card 1 */}
              <motion.div whileHover={{ y: -2 }} className="glass-card hover-lift p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[10px] border-olive-300 text-olive-600 bg-olive-50">Leave Request</Badge>
                  <span className="text-[10px] text-olive-400">2h ago</span>
                </div>
                <p className="text-sm font-semibold text-olive-900">David Smith</p>
                <p className="text-xs text-olive-600 mt-1">Dec 24 - Jan 2 (Annual Leave)</p>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-olive-600 hover:bg-olive-700 text-white text-xs py-1.5 rounded-md flex items-center justify-center transition-colors">
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </button>
                  <button className="flex-1 bg-olive-100 hover:bg-red-100 hover:text-red-700 text-olive-700 text-xs py-1.5 rounded-md flex items-center justify-center transition-colors">
                    <X className="h-3 w-3 mr-1" /> Reject
                  </button>
                </div>
              </motion.div>

              {/* Approval Card 2 */}
              <motion.div whileHover={{ y: -2 }} className="glass-card hover-lift p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600 bg-blue-50">Expense</Badge>
                  <span className="text-[10px] text-olive-400">Yesterday</span>
                </div>
                <p className="text-sm font-semibold text-olive-900">Sarah Jenkins</p>
                <p className="text-xs text-olive-600 mt-1">Client Dinner - $145.00</p>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-olive-600 hover:bg-olive-700 text-white text-xs py-1.5 rounded-md flex items-center justify-center transition-colors">
                    <Check className="h-3 w-3 mr-1" /> Approve
                  </button>
                  <button className="flex-1 bg-olive-100 hover:bg-red-100 hover:text-red-700 text-olive-700 text-xs py-1.5 rounded-md flex items-center justify-center transition-colors">
                    <X className="h-3 w-3 mr-1" /> Reject
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
