"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, X, Clock, ChevronUp, ChevronDown, CheckCircle2 } from "lucide-react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Format seconds into HH:MM:SS
const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export function GlobalTimer() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fetch projects
  useEffect(() => {
    if (!user) return;
    const fetchProjects = async () => {
      try {
        // Fetch active projects
        const q = query(collection(db, "projects"), where("status", "in", ["planning", "active"]));
        const snap = await getDocs(q);
        const projs = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
        setProjects(projs);
      } catch (err) {
        console.error("Failed to fetch projects for timer:", err);
      }
    };
    fetchProjects();
  }, [user]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("mintsGlobal_timer");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.isRunning) {
          // Calculate how much time passed since last ping
          const now = Date.now();
          const diffSeconds = Math.floor((now - parsed.lastTick) / 1000);
          setElapsedSeconds(parsed.elapsedSeconds + diffSeconds);
          setIsRunning(true);
        } else {
          setElapsedSeconds(parsed.elapsedSeconds);
        }
        setSelectedProjectId(parsed.selectedProjectId || "");
        setTaskDescription(parsed.taskDescription || "");
      } catch (e) {
        console.error("Failed to parse timer state");
      }
    }
  }, []);

  // Timer interval and local storage sync
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          // Sync to local storage every second so we don't lose much if closed
          localStorage.setItem("mintsGlobal_timer", JSON.stringify({
            isRunning: true,
            elapsedSeconds: next,
            lastTick: Date.now(),
            selectedProjectId,
            taskDescription
          }));
          return next;
        });
      }, 1000);
    } else {
      // Sync stopped state
      localStorage.setItem("mintsGlobal_timer", JSON.stringify({
        isRunning: false,
        elapsedSeconds,
        lastTick: Date.now(),
        selectedProjectId,
        taskDescription
      }));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, selectedProjectId, taskDescription, elapsedSeconds]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
    if (!isOpen) setIsOpen(true);
  };

  const handleSave = async () => {
    if (!user || elapsedSeconds < 60) {
      alert("Time logged must be at least 1 minute.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const selectedProject = projects.find(p => p.id === selectedProjectId);
      
      await addDoc(collection(db, "time_logs"), {
        userId: user.uid,
        userName: user.fullName || user.displayName || "Unknown User",
        projectId: selectedProjectId || null,
        projectName: selectedProject?.name || null,
        description: taskDescription || "General task",
        durationSeconds: elapsedSeconds,
        billableHours: Number((elapsedSeconds / 3600).toFixed(2)),
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        timestamp: serverTimestamp()
      });
      
      // Reset
      setIsRunning(false);
      setElapsedSeconds(0);
      setTaskDescription("");
      // Keep project selected for convenience
      
      localStorage.removeItem("mintsGlobal_timer");
      alert("Time logged successfully!");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to save time log:", err);
      alert("Failed to save time log. Try again.");
    }
    
    setIsSaving(false);
  };

  const handleDiscard = () => {
    if (confirm("Are you sure you want to discard this timer?")) {
      setIsRunning(false);
      setElapsedSeconds(0);
      setTaskDescription("");
      localStorage.removeItem("mintsGlobal_timer");
    }
  };

  // If there's no user, don't render
  if (!user) return null;

  return (
    <div ref={popoverRef} className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none shrink-0 shadow-sm",
          isRunning 
            ? "bg-primary text-primary-foreground border-primary/40 shadow-[0_0_14px_rgba(112,130,56,0.35)] animate-pulse" 
            : elapsedSeconds > 0
              ? "bg-secondary text-foreground border-border hover:border-primary/40"
              : "bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground border-border"
        )}
        title="Global Time Tracker"
      >
        {isRunning ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="font-mono font-bold tracking-tight text-white">{formatTime(elapsedSeconds)}</span>
          </>
        ) : (
          <>
            <Clock className={cn("w-3.5 h-3.5", elapsedSeconds > 0 ? "text-primary" : "text-muted-foreground")} />
            <span className="hidden sm:inline font-mono">
              {elapsedSeconds > 0 ? formatTime(elapsedSeconds) : "Timer"}
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 z-50 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border overflow-hidden w-[310px] sm:w-[330px] max-w-[calc(100vw-24px)]"
          >
            <div className="border-b border-border bg-muted/40 p-3 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Time Tracker
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="p-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3.5">
              <div className="text-center py-1">
                <div className={cn("text-3xl font-mono font-black tracking-tight mb-0.5 transition-colors",
                  isRunning ? "text-primary" : "text-foreground"
                )}>
                  {formatTime(elapsedSeconds)}
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">
                  {isRunning ? "● Tracking Active" : elapsedSeconds > 0 ? "❚❚ Paused" : "Ready to Track"}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="button"
                  onClick={handleStartStop}
                  className={cn(
                    "flex-1 h-9 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border-0 transition-all active:scale-95",
                    isRunning 
                      ? "bg-amber-600 hover:bg-amber-700 text-white" 
                      : "btn-primary"
                  )}
                >
                  {isRunning ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" /> {elapsedSeconds > 0 ? "Resume" : "Start"}
                    </>
                  )}
                </Button>
                {elapsedSeconds > 0 && !isRunning && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleDiscard}
                    className="h-9 text-xs font-semibold px-3 text-muted-foreground hover:text-destructive border-border rounded-xl cursor-pointer"
                  >
                    Reset
                  </Button>
                )}
              </div>
              
              <div className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Project</label>
                  <Select value={selectedProjectId} onValueChange={(val) => setSelectedProjectId(val || "")}>
                    <SelectTrigger className="h-8 text-xs text-foreground bg-background border-border rounded-xl">
                      <SelectValue placeholder="Select project (optional)..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover text-popover-foreground border-border rounded-xl">
                      <SelectItem value="internal" className="text-xs cursor-pointer">Internal / General</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Activity Notes</label>
                  <Input 
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="What are you working on?" 
                    className="h-8 text-xs text-foreground placeholder:text-muted-foreground bg-background border-border rounded-xl focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-border flex justify-end">
                <Button 
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || elapsedSeconds < 60 || isRunning}
                  size="sm" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8.5 rounded-xl font-bold cursor-pointer disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Log Time to Worksheet
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
