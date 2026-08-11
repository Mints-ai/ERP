import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckSquare, Clock, Play, Pause, X, Lock, Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import { saveFocusSession } from "@/lib/task-services";

interface FocusModeOverlayProps {
  tasks: Task[];
  onExit: () => void;
  employeesList: any[];
}

export default function FocusModeOverlay({ tasks, onExit, employeesList }: FocusModeOverlayProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Timer State
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Notes State
  const [notes, setNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  
  // Debounce Ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when active task changes
  useEffect(() => {
    if (activeTask) {
      setElapsedSeconds(activeTask.focusSession?.elapsedSeconds || 0);
      setNotes(activeTask.focusSession?.notes || "");
      setIsRunning(activeTask.focusSession?.isActive || false);
    } else {
      setIsRunning(false);
    }
  }, [activeTask?.id]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Debounced Auto-save
  useEffect(() => {
    if (!activeTask) return;
    
    setSaveStatus("saving");
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveFocusSession(activeTask.id, {
          isActive: isRunning,
          startTime: activeTask.focusSession?.startTime || new Date().toISOString(),
          elapsedSeconds,
          notes,
          checklists: activeTask.focusSession?.checklists || []
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Failed to save focus session:", err);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [notes, elapsedSeconds, isRunning, activeTask?.id]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex-1 bg-card/50 border border-border rounded-2xl p-6 flex gap-6 overflow-hidden relative"
    >
      <button 
        onClick={onExit}
        className="absolute top-4 right-4 p-2 bg-background hover:bg-muted border border-border rounded-full transition-colors z-10"
      >
        <X className="w-5 h-5 text-foreground/50" />
      </button>

      {/* Task List Sidebar */}
      <div className="w-1/3 max-w-sm flex flex-col border-r border-border pr-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">Your Focus Today</h2>
          <p className="text-xs text-foreground/40 mt-1">Select a task to begin.</p>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 pr-2 scrollbar-thin">
          {tasks.length === 0 ? (
            <div className="text-center py-12 border border-border border-dashed rounded-2xl">
              <CheckSquare className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-wider">All caught up!</h3>
            </div>
          ) : (
            tasks.map((task) => (
              <Card 
                key={task.id}
                onClick={() => setActiveTask(task)}
                className={cn("bg-card border shadow-sm rounded-lg overflow-hidden relative group cursor-pointer transition-all", 
                  activeTask?.id === task.id ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30",
                  task.priority === "Urgent" && "border-rose-500/30"
                )}
              >
                {task.priority === "Urgent" && !task.blocked && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                )}
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold text-foreground/40 border border-border px-1 rounded">{task.projectId || "General"}</span>
                    {task.blocked && <Lock className="w-3 h-3 text-foreground/30" />}
                  </div>
                  <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{task.title}</h3>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 flex flex-col">
        {!activeTask ? (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground/30">
            <Target className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-bold">Select a task to enter Focus Mode</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-extrabold text-foreground">{activeTask.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-foreground/50 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary" /> {formatTime(elapsedSeconds)} LOGGED</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsRunning(!isRunning)}
                className={cn("px-6 h-12 rounded-full font-bold text-sm uppercase tracking-widest transition-all shadow-lg flex items-center gap-2",
                  isRunning 
                    ? "bg-amber-500/10 text-amber-500 border-2 border-amber-500/20 hover:bg-amber-500 hover:text-amber-950"
                    : "bg-primary text-primary-foreground hover:brightness-110"
                )}
              >
                {isRunning ? <><Pause className="w-4 h-4 fill-current" /> Pause Focus</> : <><Play className="w-4 h-4 fill-current" /> Start Focus</>}
              </button>
            </div>

            <div className="flex-1 flex flex-col bg-background rounded-xl border border-border p-4 relative shadow-inner">
              <div className="absolute top-2 right-4 text-[10px] font-bold uppercase text-foreground/30">
                {saveStatus === "saving" && <span className="animate-pulse">Saving...</span>}
                {saveStatus === "saved" && <span className="text-primary">All changes saved</span>}
              </div>
              
              <h3 className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">Workspace Notes</h3>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Jot down notes, links, or sub-tasks while you work..."
                className="flex-1 w-full bg-transparent resize-none border-none focus:ring-0 text-sm text-foreground placeholder:text-foreground/20 leading-relaxed font-medium"
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
