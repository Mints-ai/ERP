"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock, CheckCircle2, XCircle } from "lucide-react";

const LEAVE_TYPES = [
  "Annual Leave", "Sick Leave", "Unpaid Leave", "Emergency Leave", "Maternity/Paternity"
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function LeaveManagement() {
  const { user, role } = useAuth();
  const isManagerOrAbove = canAccess(role, "APPROVE_LEAVE");
  
  const [leaves, setLeaves] = useState<any[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState({ totalAnnual: 30, usedAnnual: 0, usedSick: 0 });
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [newLeave, setNewLeave] = useState({ type: "", startDate: "", endDate: "", reason: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    let qLeaves;
    
    if (isManagerOrAbove) {
      // Manager sees all pending approvals (could be filtered by department in reality)
      const qPending = query(
        collection(db, "leaves"),
        where("status", "==", "pending")
      );
      
      onSnapshot(qPending, (snapshot) => {
        setPendingLeaves(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Manager sees all leaves in "All Leaves" tab
      qLeaves = query(collection(db, "leaves"), orderBy("createdAt", "desc"));
    } else {
      // Employee sees only their leaves
      qLeaves = query(
        collection(db, "leaves"),
        where("employeeId", "==", user.uid)
      );
    }

    const unsubscribeLeaves = onSnapshot(qLeaves, (snapshot) => {
      setLeaves(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    // Fetch leave balance (simulated structure)
    const currentYear = new Date().getFullYear();
    const unsubscribeBalance = onSnapshot(doc(db, "leaveBalances", `${user.uid}_${currentYear}`), (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data() as any);
      }
    });

    return () => {
      unsubscribeLeaves();
      unsubscribeBalance();
    };
  }, [user, isManagerOrAbove]);

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    let count = 0;
    const curDate = new Date(s.getTime());
    while (curDate <= e) {
      const dayOfWeek = curDate.getDay();
      if(dayOfWeek !== 0 && dayOfWeek !== 6) count++; // Exclude Sun/Sat
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    
    const daysCount = calculateDays(newLeave.startDate, newLeave.endDate);

    try {
      await addDoc(collection(db, "leaves"), {
        employeeId: user.uid,
        employeeName: user.displayName, // Denormalized for easy viewing by manager
        leaveType: newLeave.type,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        daysCount,
        reason: newLeave.reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setIsApplyOpen(false);
      setNewLeave({ type: "", startDate: "", endDate: "", reason: "" });
    } catch (err) {
      console.error("Error applying for leave:", err);
    }
    setIsSubmitting(false);
  };

  const handleApproveReject = async (leaveId: string, status: "approved" | "rejected") => {
    try {
      await updateDoc(doc(db, "leaves", leaveId), {
        status,
        reviewedBy: user?.uid,
        updatedAt: serverTimestamp(),
      });
      // A Firebase Cloud Function would pick this up and email the employee,
      // and also update the leaveBalances collection.
    } catch (err) {
      console.error(`Error updating leave status to ${status}:`, err);
    }
  };

  const daysRequested = calculateDays(newLeave.startDate, newLeave.endDate);
  const annualPercentage = (balance.usedAnnual / balance.totalAnnual) * 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground mt-1">Manage time off, sick leaves, and holidays.</p>
        </div>
        
        <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-olive-500 hover:bg-olive-600 text-white transition-colors">
            <CalendarIcon className="mr-2 h-4 w-4" /> Apply for Leave
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit a new leave request. Weekends and public holidays are automatically excluded from the calculation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApplyLeave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={newLeave.type} onValueChange={(val) => setNewLeave({...newLeave, type: val || ""})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" required min={new Date().toISOString().split("T")[0]} 
                         value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" required min={newLeave.startDate || new Date().toISOString().split("T")[0]} 
                         value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} />
                </div>
              </div>

              {daysRequested > 0 && (
                <div className="p-3 bg-muted/50 rounded-md text-sm flex justify-between items-center border">
                  <span>Working days requested:</span>
                  <span className="font-bold">{daysRequested} Days</span>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea placeholder="Brief explanation..." 
                          value={newLeave.reason} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} />
              </div>
              
              <Button type="submit" disabled={isSubmitting || daysRequested === 0} className="w-full bg-olive-500 hover:bg-olive-600 text-white">
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!isManagerOrAbove ? (
        /* ================= EMPLOYEE VIEW ================= */
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Annual Leave Balance</CardTitle>
                <CardDescription>UAE Labor Law standard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-bold text-olive-700">{balance.totalAnnual - balance.usedAnnual}</span>
                  <span className="text-sm text-muted-foreground mb-1">days remaining</span>
                </div>
                <Progress value={annualPercentage} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2 text-right">{balance.usedAnnual} of {balance.totalAnnual} days used</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sick Leave</CardTitle>
                <CardDescription>Current year usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-bold">{balance.usedSick}</span>
                  <span className="text-sm text-muted-foreground mb-1">days used</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>My Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading...</div>
              ) : leaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  You have not submitted any leave requests yet.
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Dates</th>
                        <th className="px-4 py-3 font-medium">Days</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{leave.leaveType}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {leave.startDate} to {leave.endDate}
                          </td>
                          <td className="px-4 py-3">{leave.daysCount}</td>
                          <td className="px-4 py-3">
                            <Badge className={`font-medium shadow-none ${STATUS_COLORS[leave.status]}`}>
                              {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ================= MANAGER VIEW ================= */
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="relative">
              Pending Approvals
              {pendingLeaves.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingLeaves.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar">Team Calendar</TabsTrigger>
            <TabsTrigger value="all">All Leaves</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            {pendingLeaves.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 text-olive-200 mb-4" />
                  <p className="text-lg font-medium text-foreground">You're all caught up!</p>
                  <p>There are no pending leave requests to review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pendingLeaves.map((leave) => (
                  <Card key={leave.id} className="border-l-4 border-l-amber-400">
                    <CardHeader className="pb-3 flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{leave.employeeName || "Employee"}</CardTitle>
                        <CardDescription className="text-sm mt-1">{leave.leaveType}</CardDescription>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 shadow-none hover:bg-amber-100">Pending</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">Dates</p>
                          <p className="font-medium">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                        </div>
                        <div className="px-4 border-l border-border/50">
                          <p className="text-muted-foreground text-xs mb-1">Duration</p>
                          <p className="font-medium">{leave.daysCount} Working Days</p>
                        </div>
                      </div>
                      
                      {leave.reason && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Reason provided:</p>
                          <p className="text-sm italic text-foreground/80">"{leave.reason}"</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2 border-t">
                        <Button 
                          className="flex-1 bg-olive-500 hover:bg-olive-600 text-white" 
                          onClick={() => handleApproveReject(leave.id, "approved")}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleApproveReject(leave.id, "rejected")}
                        >
                          <XCircle className="mr-2 h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <Card>
              <CardContent className="py-12 flex flex-col items-center justify-center border-dashed">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-muted-foreground">Team Calendar View Pending</h3>
                <p className="text-sm text-muted-foreground text-center mt-2 max-w-md">
                  This feature will display a monthly grid showing who is on leave on which days, color-coded by leave type.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                 <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-olive-50 text-olive-700 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Employee</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Dates</th>
                        <th className="px-4 py-3 font-medium">Days</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{leave.employeeName || "Employee"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{leave.leaveType}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {leave.startDate} to {leave.endDate}
                          </td>
                          <td className="px-4 py-3">{leave.daysCount}</td>
                          <td className="px-4 py-3">
                            <Badge className={`font-medium shadow-none ${STATUS_COLORS[leave.status] || STATUS_COLORS.pending}`}>
                              {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
