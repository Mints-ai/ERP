"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Objective, KeyResult, OKRStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Plus, Search, Trash2, Edit2, CheckCircle2, AlertTriangle, XCircle, MoreVertical } from "lucide-react";
import { CreateOKRDialog } from "./components/CreateOKRDialog";
import { canAccess } from "@/lib/permissions";

export default function OKRsPage() {
  const { role, user } = useAuth();
  const { showToast } = useToast();
  
  const [okrs, setOkrs] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    // Note: We fetch all okrs and filter client-side based on permission, 
    // since firestore rules also enforce this. 
    // Individual OKRs not owned by user will be rejected by firestore rules 
    // if we don't have manager access, but since we fetch all, the query itself 
    // might fail for non-managers unless we specifically query only their own + company + dept.
    // However, in this ERP app, if the user isn't a manager they shouldn't even be able to see the page,
    // OR we only let managers write and anyone can read Company/Dept.
    // For simplicity, we just run the query and let it filter.
    const q = query(collection(db, "okrs"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Objective[];
      // Client side filter just in case
      const allowedList = list.filter(okr => {
        if (okr.level !== "Individual") return true;
        if (okr.ownerUid === user?.uid) return true;
        if (canAccess(role, "MANAGE_USERS")) return true;
        return false;
      });
      setOkrs(allowedList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching OKRs", error);
      showToast("Error loading OKRs. Missing permissions?", "error");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, role, showToast]);

  const handleDelete = async (okr: Objective) => {
    if (!confirm(`Are you sure you want to delete this OKR: ${okr.title}?`)) return;
    try {
      await deleteDoc(doc(db, "okrs", okr.id));
      showToast("OKR deleted.", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleUpdateKR = async (okr: Objective, krId: string, newValue: number) => {
    try {
      const newKrs = okr.keyResults.map(kr => {
        if (kr.id === krId) {
          return { ...kr, currentValue: newValue };
        }
        return kr;
      });

      // Recalculate progress
      let totalProgress = 0;
      newKrs.forEach(kr => {
        const p = Math.min(100, Math.max(0, (kr.currentValue / kr.targetValue) * 100));
        totalProgress += p;
      });
      const overallProgress = newKrs.length > 0 ? totalProgress / newKrs.length : 0;
      
      let status: OKRStatus = "On Track";
      if (overallProgress === 100) status = "Completed";
      else if (overallProgress < 30) status = "At Risk";

      await updateDoc(doc(db, "okrs", okr.id), {
        keyResults: newKrs,
        progress: overallProgress,
        status
      });
      showToast("Progress updated", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const queryStr = searchQuery.toLowerCase();
  const filtered = okrs.filter(o => {
    const titleMatch = o.title ? o.title.toLowerCase().includes(queryStr) : false;
    const quarterMatch = o.quarter ? o.quarter.toLowerCase().includes(queryStr) : false;
    const ownerMatch = o.ownerName ? o.ownerName.toLowerCase().includes(queryStr) : false;
    const deptMatch = o.department ? o.department.toLowerCase().includes(queryStr) : false;
    return titleMatch || quarterMatch || ownerMatch || deptMatch;
  });

  const companyOkrs = filtered.filter(o => o.level === "Company");
  const deptOkrs = filtered.filter(o => o.level === "Department");
  const individualOkrs = filtered.filter(o => o.level === "Individual");

  const renderOkrCard = (okr: Objective) => {
    const isOwner = okr.ownerUid === user?.uid;
    const canEdit = canAccess(role, "MANAGE_USERS") || isOwner;

    return (
      <Card key={okr.id} className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 flex flex-row items-start justify-between">
          <div>
            <div className="flex gap-2 items-center mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                {okr.quarter}
              </Badge>
              {okr.level === "Department" && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                  {okr.department}
                </Badge>
              )}
              {okr.level === "Individual" && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                  {okr.ownerName}
                </Badge>
              )}
              <Badge variant="outline" className={
                okr.status === "Completed" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                okr.status === "On Track" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                "bg-amber-500/10 text-amber-500 border-amber-500/20"
              }>
                {okr.status}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight mt-2">{okr.title}</CardTitle>
          </div>
          {canAccess(role, "MANAGE_USERS") && (
            <Button size="icon" variant="ghost" className="text-foreground/40 hover:text-rose-500 -mt-2 -mr-2" onClick={() => handleDelete(okr)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Main Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-foreground/70 uppercase">Overall Progress</span>
              <span className="font-bold text-primary">{Math.round(okr.progress)}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${okr.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} 
                style={{ width: `${okr.progress}%` }} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-foreground/50 uppercase tracking-widest border-b border-border pb-1">Key Results</p>
            {okr.keyResults.map(kr => {
              const krProgress = Math.min(100, Math.max(0, (kr.currentValue / kr.targetValue) * 100));
              return (
                <div key={kr.id} className="group relative">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground font-medium flex-1 pr-4">{kr.title}</span>
                    <span className="text-foreground/70 font-mono">
                      {kr.currentValue} / {kr.targetValue} <span className="text-foreground/40">{kr.unit}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-foreground/30 transition-all" 
                      style={{ width: `${krProgress}%` }} 
                    />
                  </div>
                  {/* Inline Edit (Hidden until hover if editable) */}
                  {canEdit && okr.status !== "Completed" && (
                    <div className="absolute -top-1 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-card p-1 rounded border border-border shadow-sm flex gap-1 items-center z-10">
                      <Input 
                        type="number" 
                        defaultValue={kr.currentValue}
                        className="h-7 w-20 text-xs bg-background border-border"
                        onBlur={(e) => {
                          const val = Number(e.target.value);
                          if (val !== kr.currentValue) handleUpdateKR(okr, kr.id, val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                      />
                      <span className="text-xs text-foreground/50 mr-1">Enter to save</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Goals & OKRs</h1>
          <p className="text-foreground/50 mt-1">Track Objectives and Key Results across the organization.</p>
        </div>
        
        {canAccess(role, "MANAGE_USERS") && (
          <Button onClick={() => setCreateOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Create Objective
          </Button>
        )}
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        <Input
          placeholder="Search goals, departments, or owners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background border-border"
        />
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="bg-muted/50 border border-border p-1">
          <TabsTrigger value="company" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            Company OKRs ({companyOkrs.length})
          </TabsTrigger>
          <TabsTrigger value="department" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            Department OKRs ({deptOkrs.length})
          </TabsTrigger>
          <TabsTrigger value="individual" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            Individual OKRs ({individualOkrs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6 focus-visible:outline-none">
          {loading ? <div className="text-foreground/50">Loading...</div> : 
           companyOkrs.length === 0 ? <div className="text-foreground/50">No company OKRs found.</div> :
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {companyOkrs.map(renderOkrCard)}
           </div>
          }
        </TabsContent>

        <TabsContent value="department" className="mt-6 focus-visible:outline-none">
          {loading ? <div className="text-foreground/50">Loading...</div> : 
           deptOkrs.length === 0 ? <div className="text-foreground/50">No department OKRs found.</div> :
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {deptOkrs.map(renderOkrCard)}
           </div>
          }
        </TabsContent>

        <TabsContent value="individual" className="mt-6 focus-visible:outline-none">
          {loading ? <div className="text-foreground/50">Loading...</div> : 
           individualOkrs.length === 0 ? <div className="text-foreground/50">No individual OKRs found.</div> :
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {individualOkrs.map(renderOkrCard)}
           </div>
          }
        </TabsContent>
      </Tabs>

      <CreateOKRDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
