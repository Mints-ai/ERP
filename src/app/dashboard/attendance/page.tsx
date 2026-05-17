"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Play, Square, Coffee, Clock, CalendarIcon, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Helper for formatting time
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<"out" | "in" | "break">("out");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (status === "in") {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Format elapsed time (HH:MM:SS)
  const formatElapsed = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Mock Logs
  const mockLogs = [
    { type: "in", time: "09:00 AM", label: "Clocked In" },
    { type: "break", time: "01:00 PM", label: "Lunch Break Start" },
    { type: "in", time: "02:00 PM", label: "Lunch Break End" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-olive-900">Attendance</h1>
          <p className="text-olive-600 mt-1">Track your daily working hours and breaks.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-olive-200 shadow-sm">
          <CalendarIcon className="w-5 h-5 text-olive-500" />
          <span className="font-semibold text-olive-900">{formatDate(currentTime)}</span>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Main Clock Section */}
        <div className="lg:col-span-2 flex flex-col h-full gap-6">
          <Card className="flex-1 border-olive-200 shadow-card flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-white to-olive-50">
            {/* Background animated rings based on status */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              {status === "in" && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-96 h-96 rounded-full border-4 border-green-500"
                />
              )}
            </div>

            <CardContent className="p-8 flex flex-col items-center z-10 w-full">
              <div className="mb-8 text-center space-y-2">
                <Badge variant="outline" className={cn("text-xs font-bold uppercase tracking-widest border-2 px-4 py-1.5", 
                  status === "in" ? "bg-green-100 text-green-700 border-green-200" : 
                  status === "break" ? "bg-amber-100 text-amber-700 border-amber-200" : 
                  "bg-slate-100 text-slate-700 border-slate-200"
                )}>
                  {status === "in" ? "Currently Working" : status === "break" ? "On Break" : "Clocked Out"}
                </Badge>
              </div>

              {/* Huge Clock */}
              <div className="text-7xl md:text-8xl font-black text-olive-900 tracking-tighter mb-2 tabular-nums">
                {formatTime(currentTime)}
              </div>

              {/* Elapsed Time */}
              <div className="flex items-center gap-2 text-olive-500 font-bold text-xl mb-12">
                <Clock className="w-5 h-5" />
                <span className="tabular-nums">Today: {formatElapsed(status === "out" ? 28800 : elapsedSeconds + 14400)}</span> {/* Mock starting hours if clocked in */}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-4 w-full max-w-md">
                {status === "out" ? (
                  <Button 
                    size="lg" 
                    className="w-full h-16 text-lg bg-olive-600 hover:bg-olive-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl"
                    onClick={() => { setStatus("in"); setElapsedSeconds(0); }}
                  >
                    <Play className="w-6 h-6 mr-3" /> Clock In
                  </Button>
                ) : (
                  <>
                    <Button 
                      size="lg" 
                      variant={status === "break" ? "default" : "outline"}
                      className={cn("flex-1 h-16 text-lg transition-all rounded-xl", 
                        status === "break" ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md border-transparent" : "bg-white text-amber-600 border-amber-200 hover:bg-amber-50"
                      )}
                      onClick={() => setStatus(status === "break" ? "in" : "break")}
                    >
                      {status === "break" ? <Play className="w-5 h-5 mr-2" /> : <Coffee className="w-5 h-5 mr-2" />}
                      {status === "break" ? "Resume" : "Take Break"}
                    </Button>
                    <Button 
                      size="lg" 
                      variant="destructive"
                      className="flex-1 h-16 text-lg bg-red-500 hover:bg-red-600 text-white shadow-md transition-all rounded-xl"
                      onClick={() => setStatus("out")}
                    >
                      <Square className="w-5 h-5 mr-2" /> Clock Out
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Rail - Logs & Summary */}
        <div className="space-y-6 overflow-y-auto">
          {/* User Profile Summary */}
          <Card className="border-olive-200 shadow-sm bg-olive-900 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <Avatar className="h-16 w-16 border-2 border-olive-700 shadow-sm">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-olive-800 text-olive-100 text-xl font-bold">
                    {user?.displayName?.substring(0, 2).toUpperCase() || "JD"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-xl">{user?.displayName || "John Doe"}</h3>
                  <p className="text-olive-400 font-medium">{user?.role?.replace("_", " ").toUpperCase() || "EMPLOYEE"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-olive-800 rounded-lg p-3">
                  <p className="text-xs text-olive-400 uppercase tracking-wider font-bold mb-1">Required</p>
                  <p className="text-lg font-bold">8h 00m</p>
                </div>
                <div className="bg-olive-800 rounded-lg p-3">
                  <p className="text-xs text-olive-400 uppercase tracking-wider font-bold mb-1">Overtime</p>
                  <p className="text-lg font-bold text-green-400">+1h 15m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card className="border-olive-200 shadow-sm flex-1">
            <CardHeader className="pb-4 border-b border-olive-100 flex flex-row items-center justify-between">
              <h3 className="font-bold text-olive-900 text-lg">Today's Log</h3>
              <Button variant="ghost" size="sm" className="text-olive-500 hover:text-olive-900 h-8">
                History <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-olive-100">
                {mockLogs.map((log, idx) => (
                  <div key={idx} className="p-4 flex gap-4 hover:bg-olive-50/50 transition-colors">
                    <div className="shrink-0 pt-1">
                      {log.type === "in" ? (
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                          <Play className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Coffee className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-olive-900">{log.label}</p>
                        <p className="text-xs text-olive-500 font-medium">Verified by IP Address</p>
                      </div>
                      <span className="font-bold text-olive-700 text-sm tabular-nums">{log.time}</span>
                    </div>
                  </div>
                ))}
                
                {status !== "out" && (
                  <div className="p-4 flex gap-4 bg-olive-50/50">
                    <div className="shrink-0 pt-1">
                      <div className="w-8 h-8 rounded-full border-2 border-olive-300 border-dashed flex items-center justify-center animate-spin-slow">
                        <div className="w-2 h-2 bg-olive-400 rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1 flex justify-between items-center opacity-60">
                      <div>
                        <p className="font-bold text-olive-900 italic">Current Session...</p>
                      </div>
                      <span className="font-bold text-olive-700 text-sm tabular-nums">{formatTime(currentTime)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
