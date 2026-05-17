"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OKRManagement() {
  const { user, role } = useAuth();
  const [okrs, setOkrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [objective, setObjective] = useState("");
  const [keyResult, setKeyResult] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "okrs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOkrs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddOKR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective || !keyResult) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "okrs"), {
        objective,
        keyResult,
        targetValue,
        currentValue: 0,
        assignedTo: assignedTo || "Company-Wide",
        status: "on_track",
        createdAt: serverTimestamp(),
        createdBy: user?.uid
      });
      setIsAddOpen(false);
      setObjective("");
      setKeyResult("");
      setTargetValue("");
      setAssignedTo("");
    } catch (err) {
      console.error("Error adding OKR:", err);
    }
    setIsSubmitting(false);
  };

  return (
    <RoleGuard permission="MANAGE_USERS" fallback={<div>Access Denied.</div>}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-8 w-8 text-olive-600" /> Goal Tracking (OKRs)
            </h1>
            <p className="text-muted-foreground mt-1">Set, track, and manage Objectives and Key Results.</p>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-olive-500 hover:bg-olive-600 text-white transition-colors">
              <Plus className="mr-2 h-4 w-4" /> New Goal
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Objective</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddOKR} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Objective (The Goal)</label>
                  <Input required placeholder="E.g., Increase organic website traffic" value={objective} onChange={e => setObjective(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Key Result (How to measure it)</label>
                  <Input required placeholder="E.g., Reach 50k monthly visitors" value={keyResult} onChange={e => setKeyResult(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Value (Numeric)</label>
                    <Input required type="number" placeholder="50000" value={targetValue} onChange={e => setTargetValue(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign To</label>
                    <Input placeholder="Employee Name or Dept" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-olive-600 text-white">Save OKR</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading goals...</div>
        ) : okrs.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="p-12 text-center flex flex-col items-center justify-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-medium text-olive-900">No Goals Set</h3>
              <p className="text-sm text-muted-foreground mt-1">Start by adding a company-wide or department OKR.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {okrs.map(okr => {
              const target = parseFloat(okr.targetValue) || 100;
              const current = parseFloat(okr.currentValue) || 0;
              const progress = Math.min(100, Math.round((current / target) * 100));
              
              return (
                <Card key={okr.id} className="border-olive-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3 border-b border-olive-100 bg-olive-50/50">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-lg leading-tight text-olive-900">{okr.objective}</CardTitle>
                      <Badge variant="outline" className={cn(
                        "whitespace-nowrap capitalize",
                        progress >= 100 ? "border-green-200 text-green-700 bg-green-50" : 
                        progress > 30 ? "border-blue-200 text-blue-700 bg-blue-50" : "border-amber-200 text-amber-700 bg-amber-50"
                      )}>
                        {progress >= 100 ? "Completed" : okr.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-olive-500 uppercase tracking-wider mb-1">Key Result</p>
                      <p className="text-sm text-olive-800">{okr.keyResult}</p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground font-medium">{current} / {target}</span>
                        <span className="font-bold text-olive-700">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    
                    <div className="pt-3 border-t flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Assigned: <strong className="text-olive-700">{okr.assignedTo}</strong></span>
                      <button className="text-olive-600 hover:text-olive-800 font-medium hover:underline">Update Progress</button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
