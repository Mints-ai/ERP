"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot } from "firebase/firestore";
import { OKRLevel, KeyResult, OKRStatus } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Plus, Trash2, Save } from "lucide-react";

interface CreateOKRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOKRDialog({ open, onOpenChange }: CreateOKRDialogProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<OKRLevel>("Company");
  const [quarter, setQuarter] = useState(() => {
    const d = new Date();
    return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  });
  const [department, setDepartment] = useState("");
  const [ownerUid, setOwnerUid] = useState("");
  
  const [employees, setEmployees] = useState<{ id: string; fullName: string; email: string }[]>([]);

  // Key Results
  const [krs, setKrs] = useState<Omit<KeyResult, "id">[]>([
    { title: "", currentValue: 0, targetValue: 100, unit: "%" }
  ]);

  useEffect(() => {
    if (!open) return;
    const q = query(collection(db, "employees"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        fullName: doc.data().fullName || doc.data().email,
        email: doc.data().email,
      }));
      setEmployees(list);
    });
    return () => unsubscribe();
  }, [open]);

  const handleAddKR = () => {
    setKrs([...krs, { title: "", currentValue: 0, targetValue: 100, unit: "%" }]);
  };

  const handleRemoveKR = (index: number) => {
    if (krs.length <= 1) return;
    const newKrs = [...krs];
    newKrs.splice(index, 1);
    setKrs(newKrs);
  };

  const handleKRChange = (index: number, field: keyof KeyResult, value: any) => {
    const newKrs = [...krs];
    (newKrs[index] as any)[field] = value;
    setKrs(newKrs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || krs.some(kr => !kr.title || kr.targetValue === 0)) {
      showToast("Please fill in all required fields and ensure targets are not 0.", "warning");
      return;
    }

    setLoading(true);
    try {
      // Calculate initial progress based on KRs
      let totalProgress = 0;
      const formattedKrs = krs.map((kr, i) => {
        const progress = Math.min(100, Math.max(0, (kr.currentValue / kr.targetValue) * 100));
        totalProgress += progress;
        return {
          id: `kr-${Date.now()}-${i}`,
          title: kr.title,
          currentValue: Number(kr.currentValue),
          targetValue: Number(kr.targetValue),
          unit: kr.unit || "%"
        };
      });
      
      const overallProgress = formattedKrs.length > 0 ? totalProgress / formattedKrs.length : 0;
      
      let status: OKRStatus = "On Track";
      if (overallProgress === 100) status = "Completed";
      else if (overallProgress < 30) status = "At Risk";

      const ownerName = ownerUid ? employees.find(e => e.id === ownerUid)?.fullName : undefined;

      await addDoc(collection(db, "okrs"), {
        title,
        level,
        quarter,
        department: level === "Department" ? department : null,
        ownerUid: level === "Individual" ? ownerUid : null,
        ownerName: level === "Individual" ? ownerName : null,
        keyResults: formattedKrs,
        progress: overallProgress,
        status,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
      });

      showToast("Objective created successfully.", "success");
      
      // Reset form
      setTitle("");
      setLevel("Company");
      setDepartment("");
      setOwnerUid("");
      setKrs([{ title: "", currentValue: 0, targetValue: 100, unit: "%" }]);
      onOpenChange(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create Objective & Key Results
          </DialogTitle>
          <DialogDescription>
            Define a new goal and its measurable key results.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Objective Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground/50 uppercase">Objective Title</label>
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Increase recurring revenue by 20%"
                className="bg-background border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/50 uppercase">Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as OKRLevel)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="Company">Company</option>
                  <option value="Department">Department</option>
                  <option value="Individual">Individual</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/50 uppercase">Quarter / Timeframe</label>
                <Input
                  required
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  placeholder="e.g. Q1 2026"
                  className="bg-background border-border text-foreground"
                />
              </div>
            </div>

            {level === "Department" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/50 uppercase">Department</label>
                <Input
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering, Sales, Marketing"
                  className="bg-background border-border text-foreground"
                />
              </div>
            )}

            {level === "Individual" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/50 uppercase">Owner (Employee)</label>
                <select
                  required
                  value={ownerUid}
                  onChange={(e) => setOwnerUid(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="" disabled>Select Employee...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Key Results Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Key Results</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddKR} className="h-8 border-border">
                <Plus className="w-3 h-3 mr-1" /> Add KR
              </Button>
            </div>
            
            <div className="space-y-3">
              {krs.map((kr, index) => (
                <div key={index} className="flex gap-2 items-start bg-muted/30 p-3 rounded-lg border border-border">
                  <div className="flex-1 space-y-3">
                    <Input
                      required
                      placeholder="Key Result Description (e.g. Acquire 500 new users)"
                      value={kr.title}
                      onChange={(e) => handleKRChange(index, "title", e.target.value)}
                      className="bg-background h-9 border-border"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1 flex gap-2 items-center">
                        <Input
                          type="number"
                          required
                          placeholder="Current"
                          value={kr.currentValue}
                          onChange={(e) => handleKRChange(index, "currentValue", e.target.value)}
                          className="bg-background h-9 border-border w-24"
                        />
                        <span className="text-foreground/40 text-sm">/</span>
                        <Input
                          type="number"
                          required
                          placeholder="Target"
                          value={kr.targetValue}
                          onChange={(e) => handleKRChange(index, "targetValue", e.target.value)}
                          className="bg-background h-9 border-border w-24"
                        />
                        <Input
                          placeholder="Unit (e.g. %, $)"
                          value={kr.unit}
                          onChange={(e) => handleKRChange(index, "unit", e.target.value)}
                          className="bg-background h-9 border-border w-20"
                        />
                      </div>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveKR(index)}
                    disabled={krs.length === 1}
                    className="text-foreground/40 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Create OKR
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
